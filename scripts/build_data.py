#!/usr/bin/env python3
"""Build Miggle's word data.

Reads the curated sources in data-src/ and writes:
  public/data/words.json  {WORD: [fullDist, par|null]}
                          fullDist: steps to MIGUEL using any accepted word (-1 = dead end)
                          par:      steps to MIGUEL using common words only (null if the word
                                    is not common or cannot reach MIGUEL through common words)
  public/data/daily.json  [START_WORD, ...] in puzzle order (puzzle #N uses index (N-1) % len)

A step keeps 5 of the 6 letters (multiset) and swaps one for a different letter;
the result may be any rearrangement. See CLAUDE.md §2.

Standard library only. Maintenance flags:
  --import-enable PATH  regenerate data-src/enable6.txt from a full ENABLE word list
  --refresh-freq        regenerate data-src/freq6.tsv (requires the `wordfreq` package)
"""

from __future__ import annotations

import argparse
import collections
import gzip
import json
import random
import string
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data-src"
OUT = ROOT / "public" / "data"

TARGET = "MIGUEL"
WORD_LEN = 6

COMMON_ZIPF = 3.0  # wordfreq Zipf threshold for the "common" tier (par)
DAILY_ZIPF = 3.2  # daily start words should be well known
DAILY_PAR = range(4, 8)  # par 4..7 inclusive
DAILY_MIN_LEN = 3 * 365 + 1  # at least three years of puzzles
DAILY_SEED = 20261024

ENABLE6 = SRC / "enable6.txt"
FREQ = SRC / "freq6.tsv"
BLOCKLIST = SRC / "blocklist.txt"
ALLOWLIST = SRC / "allowlist.txt"
DAILY_EXCLUDE = SRC / "daily-exclude.txt"


# --------------------------------------------------------------------------- sources


def read_list(path: Path) -> list[str]:
    """Upper-cased words from a text file (whitespace-separated), ignoring # comments."""
    words = []
    for line in path.read_text(encoding="utf-8").splitlines():
        words += [w.upper() for w in line.split("#", 1)[0].split()]
    return words


def import_enable(path: Path) -> None:
    words = sorted(
        {w.strip().lower() for w in path.read_text(encoding="ascii").splitlines()}
        - {""}
    )
    six = [w for w in words if len(w) == WORD_LEN and w.isalpha()]
    header = (
        "# 6-letter words from ENABLE (Enhanced North American Benchmark Lexicon),\n"
        "# public domain. Regenerate with: scripts/build_data.py --import-enable enable1.txt\n"
    )
    ENABLE6.write_text(header + "\n".join(six) + "\n", encoding="utf-8")
    print(f"wrote {ENABLE6.relative_to(ROOT)}: {len(six)} words")
    words_set = set(words)
    # Keep the 5-letter base forms too, so inflection detection works offline.
    bases = sorted(w for w in words_set if len(w) in (3, 4, 5) and w.isalpha())
    (SRC / "enable-bases.txt").write_text(
        "# 3-5 letter ENABLE words, used only to detect inflected forms (plurals, -ed, -ing).\n"
        + "\n".join(bases)
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote data-src/enable-bases.txt: {len(bases)} words")


def refresh_freq() -> None:
    try:
        from wordfreq import zipf_frequency  # type: ignore[import-not-found]
    except ImportError:
        sys.exit("--refresh-freq needs the `wordfreq` package (pip install wordfreq)")
    words = read_list(ENABLE6) + read_list(ALLOWLIST)
    rows = []
    for w in sorted(set(words)):
        z = zipf_frequency(w.lower(), "en")
        if z > 0:
            rows.append(f"{w.lower()}\t{z:.2f}")
    FREQ.write_text(
        "# word<TAB>Zipf frequency (wordfreq, English). Words absent here have Zipf 0.\n"
        "# Regenerate with: scripts/build_data.py --refresh-freq\n" + "\n".join(rows) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {FREQ.relative_to(ROOT)}: {len(rows)} rows")


def read_freq() -> dict[str, float]:
    freq = {}
    for line in FREQ.read_text(encoding="utf-8").splitlines():
        if line.startswith("#") or not line.strip():
            continue
        word, z = line.split("\t")
        freq[word.upper()] = float(z)
    return freq


# --------------------------------------------------------------------------- graph


def key(word: str) -> str:
    return "".join(sorted(word))


def build_buckets(words: set[str]) -> dict[str, list[str]]:
    buckets: dict[str, list[str]] = collections.defaultdict(list)
    for w in words:
        buckets[key(w)].append(w)
    return buckets


def neighbour_keys(k: str) -> set[str]:
    """Sorted-letter keys reachable by removing one letter and adding a different one."""
    out = set()
    for i, removed in enumerate(k):
        if i > 0 and k[i - 1] == removed:
            continue  # same letter removed twice gives the same remainder
        rest = k[:i] + k[i + 1 :]
        for added in string.ascii_uppercase:
            if added != removed:
                out.add(key(rest + added))
    return out


def neighbours(word: str, buckets: dict[str, list[str]]) -> list[str]:
    return [n for nk in neighbour_keys(key(word)) for n in buckets.get(nk, ())]


def bfs(words: set[str]) -> dict[str, int]:
    """Distance from TARGET to every word in `words` (TARGET is added as the source)."""
    nodes = words | {TARGET}
    buckets = build_buckets(nodes)
    dist = {TARGET: 0}
    queue = collections.deque([TARGET])
    while queue:
        w = queue.popleft()
        for n in neighbours(w, buckets):
            if n not in dist:
                dist[n] = dist[w] + 1
                queue.append(n)
    return dist


def path_to_target(start: str, dist: dict[str, int], buckets: dict[str, list[str]]) -> list[str]:
    """Greedy shortest path, preferring alphabetical order among equal options."""
    path = [start]
    while path[-1] != TARGET:
        d = dist[path[-1]]
        path.append(min(n for n in neighbours(path[-1], buckets) if dist.get(n) == d - 1))
    return path


# --------------------------------------------------------------------------- daily list


def is_inflection(w: str, bases: set[str]) -> bool:
    """Heuristic: plural / -ed / -ing forms of a shorter word make dull start words."""
    lw = w.lower()
    cands = []
    if lw.endswith("s"):
        cands += [lw[:-1], lw[:-2] if lw.endswith("es") else ""]
    if lw.endswith("ed"):
        cands += [lw[:-1], lw[:-2], lw[:-3] if lw[-3] == lw[-4] else ""]
    if lw.endswith("ies") or lw.endswith("ied"):
        cands.append(lw[:-3] + "y")
    if lw.endswith("ing"):
        cands += [lw[:-3], lw[:-3] + "e", lw[:-4] if lw[-4] == lw[-5] else ""]
    return any(c and c in bases for c in cands)


def smooth_round_robin(buckets: dict[int, list[str]]) -> list[str]:
    """Interleave buckets in proportion to their size, spreading each evenly."""
    queues = {k: collections.deque(v) for k, v in buckets.items() if v}
    weights = {k: len(v) for k, v in queues.items()}
    total = sum(weights.values())
    current = {k: 0 for k in queues}
    out = []
    for _ in range(total):
        for k in current:
            current[k] += weights[k]
        best = max(current, key=lambda k: (current[k], -k))
        current[best] -= total
        out.append(queues[best].popleft())
    return out


def build_daily(
    common: set[str],
    par: dict[str, int],
    freq: dict[str, float],
    bases: set[str],
    exclude: set[str],
) -> list[str]:
    cands = sorted(
        w
        for w in common
        if w != TARGET
        and w not in exclude
        and par.get(w, -1) in DAILY_PAR
        and freq.get(w, 0) >= DAILY_ZIPF
        and not is_inflection(w, bases)
    )
    # One word per anagram family: anagrams share every neighbour, so they are the same puzzle.
    by_key: dict[str, str] = {}
    for w in sorted(cands, key=lambda w: (-freq.get(w, 0), w)):
        by_key.setdefault(key(w), w)
    rng = random.Random(DAILY_SEED)
    by_par: dict[int, list[str]] = collections.defaultdict(list)
    for w in sorted(by_key.values()):
        by_par[par[w]].append(w)
    for ws in by_par.values():
        rng.shuffle(ws)
    return smooth_round_robin(dict(sorted(by_par.items())))


# --------------------------------------------------------------------------- main


def histogram(values) -> str:
    c = collections.Counter(values)
    return " · ".join(f"{k}: {c[k]}" for k in sorted(c, key=lambda k: (k is None, k or 0)))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--import-enable", type=Path, metavar="PATH")
    ap.add_argument("--refresh-freq", action="store_true")
    args = ap.parse_args()
    if args.import_enable:
        import_enable(args.import_enable)
    if args.refresh_freq:
        refresh_freq()

    blocked = set(read_list(BLOCKLIST))
    allowed = set(read_list(ALLOWLIST))
    daily_exclude = set(read_list(DAILY_EXCLUDE))
    for w in allowed | blocked | daily_exclude:
        if len(w) != WORD_LEN or not w.isalpha():
            sys.exit(f"bad curation entry {w!r}: must be {WORD_LEN} letters")
    if overlap := allowed & blocked:
        sys.exit(f"words in both allowlist and blocklist: {sorted(overlap)}")

    freq = read_freq()
    bases = {w.lower() for w in read_list(SRC / "enable-bases.txt")}
    accepted = (set(read_list(ENABLE6)) | allowed) - blocked - {TARGET}
    common = {w for w in accepted if freq.get(w, 0) >= COMMON_ZIPF} | allowed

    full = bfs(accepted)
    par = bfs(common)

    words = {w: [full.get(w, -1), par.get(w) if w in common else None] for w in sorted(accepted)}
    words[TARGET] = [0, 0]
    daily = build_daily(common, par, freq, bases, daily_exclude)
    if len(daily) < DAILY_MIN_LEN:
        sys.exit(f"daily list too short: {len(daily)} < {DAILY_MIN_LEN}")

    OUT.mkdir(parents=True, exist_ok=True)
    words_json = json.dumps(dict(sorted(words.items())), separators=(",", ":")) + "\n"
    daily_json = json.dumps(daily, separators=(",", ":")) + "\n"
    (OUT / "words.json").write_text(words_json, encoding="utf-8")
    (OUT / "daily.json").write_text(daily_json, encoding="utf-8")

    # ------------------------------------------------------------------ report
    def kb(s: str) -> str:
        raw = len(s.encode())
        return f"{raw / 1024:.1f} KB raw, {len(gzip.compress(s.encode(), 9)) / 1024:.1f} KB gzip"

    reachable_common = [w for w in common if w in par and w != TARGET]
    print(f"accepted words : {len(accepted)} (blocked {len(blocked & set(read_list(ENABLE6)))})")
    print(f"common words   : {len(common)} (Zipf >= {COMMON_ZIPF}, +{len(allowed)} allowlisted)")
    print(f"dead ends      : {sum(1 for v in words.values() if v[0] == -1)} of {len(accepted)}")
    print(f"common, no par : {len(common) - len(reachable_common)}")
    print(f"fullDist hist  : {histogram(v[0] for w, v in words.items() if w != TARGET)}")
    print(f"par hist       : {histogram(par[w] for w in reachable_common)}")
    print(f"daily          : {len(daily)} puzzles (~{len(daily) / 365:.1f} years)")
    print(f"daily par hist : {histogram(par[w] for w in daily)}")
    print(f"daily first 10 : {' '.join(daily[:10])}")
    print(f"words.json     : {kb(words_json)}")
    print(f"daily.json     : {kb(daily_json)}")
    print("sample par paths (common words only):")
    common_buckets = build_buckets(common | {TARGET})
    for w in ["CASTLE", "BRIDGE", "ORANGE", "PLANET", *daily[:4]]:
        if w in par:
            print(f"  {par[w]}  {' → '.join(path_to_target(w, par, common_buckets))}")
    print("under-par examples (obscure words shorten the path):")
    full_buckets = build_buckets(accepted | {TARGET})
    shown = 0
    for w in daily:
        if full[w] < par[w]:
            print(f"  {w}: par {par[w]}, {' → '.join(path_to_target(w, full, full_buckets))}")
            shown += 1
            if shown == 3:
                break


if __name__ == "__main__":
    main()
