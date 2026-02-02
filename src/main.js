import "./main.css";

// Example: toggle dark mode
const toggle = document.getElementById("toggle-dark");
if (toggle) {
  toggle.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
  });
}
