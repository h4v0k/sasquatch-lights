import { registerRootComponent } from 'expo';
// Defines the background location task; must load before the app renders.
import './src/roadlock/useRoadLock';
import App from './src/App';

registerRootComponent(App);
