import '@fontsource-variable/fredoka';
import './styles/tokens.css';
import './styles/base.css';
import './styles/game.css';
import { dayNumber, startWord } from './engine/daily';
import { loadGameData } from './engine/words';
import { mountGame } from './ui/play';

async function init(root: HTMLElement): Promise<void> {
  try {
    const { dict, daily } = await loadGameData();
    const day = dayNumber(Date.now());
    const start = startWord(day, daily);
    mountGame({ root, dict, start, par: dict.par(start)!, label: `#${day}` });
  } catch (err) {
    console.error(err);
    const msg = document.createElement('p');
    msg.className = 'status-message';
    msg.textContent = "Couldn't load today's puzzle.";
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn btn--primary';
    retry.textContent = 'Try again';
    retry.addEventListener('click', () => {
      root.replaceChildren(msg);
      msg.textContent = 'Loading…';
      void init(root);
    });
    root.replaceChildren(msg, retry);
  }
}

const root = document.querySelector<HTMLElement>('#game');
if (root) void init(root);
