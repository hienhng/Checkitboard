import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "VocabCheckUp - Vocabulary Learning Platform";

createRoot(document.getElementById("root")!).render(<App />);
