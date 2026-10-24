// Entry for the static content pages (About, Privacy, How to play, Answers): styles + offline support.
import '@fontsource-variable/fredoka';
import './styles/tokens.css';
import './styles/base.css';
import './styles/game.css';
import './styles/content.css';
import { registerServiceWorker } from './sw-register';

registerServiceWorker();
