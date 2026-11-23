import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/main.css';
import { renderHeader } from './components/header.js';

export function initPage(activePage) {
  renderHeader(activePage);
}
