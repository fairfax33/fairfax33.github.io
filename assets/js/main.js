//Marks the nav link for the page currently being viewed
document.addEventListener("DOMContentLoaded", function () {
  const currentFile = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".site-nav a").forEach(function (link) {
    if (link.getAttribute("href") === currentFile) {
      link.setAttribute("aria-current", "page");
    }
  });
});
