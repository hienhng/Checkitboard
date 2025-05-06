import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "Checkit - Vocabulary Learning Platform";

createRoot(document.getElementById("root")!).render(<App />);
