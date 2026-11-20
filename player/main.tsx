import { createRoot } from "react-dom/client";
import { TVPlayer } from "../src/player/player";
import "../src/styles.css";

const element = document.getElementById("root");
if (element) createRoot(element).render(<TVPlayer />);