// Main Dashboard
// App.js holds everything you see on screen.
// It is the central control center
// All things we plug in to the control center are "parts of the screen"
// The control center it controls all screens

import './App.css';
import {BrowserRouter} from "react-router-dom";
import MainApp from "./components/MainApp";


function App() {

  return (
      <BrowserRouter>
          <MainApp/>
      </BrowserRouter>
  );
}

export default App;
