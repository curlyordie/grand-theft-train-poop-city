import RAPIER from '@dimforge/rapier3d-compat';
import { loadAssets } from './world/assets';
import { Game } from './game';
import './style.css';

async function initialise() {
  try { await Promise.all([RAPIER.init(),loadAssets()]); new Game(); }
  catch (error) {
    console.error('Game initialisation failed:', error);
    const app = document.querySelector('#app')!; app.replaceChildren();
    const panel = document.createElement('div'); panel.id = 'loading';
    const title = document.createElement('h1'); title.textContent = 'Grand Theft Train: Poop City';
    const message = document.createElement('p'); message.textContent = 'Could not open the city. This game needs WebGL and a modern desktop browser. Check the browser console for details.';
    const retry = document.createElement('button'); retry.className = 'primary'; retry.textContent = 'RETRY'; retry.addEventListener('click', () => location.reload());
    panel.append(title, message, retry); app.append(panel);
  }
}
void initialise();
