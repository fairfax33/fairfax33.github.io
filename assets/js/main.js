//Marks the nav link for the page currently being viewed
document.addEventListener("DOMContentLoaded", function () {
  const currentFile = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".site-nav a").forEach(function (link) {
    if (link.getAttribute("href") === currentFile) {
      link.setAttribute("aria-current", "page");
    }
  });
});

//Fills in the footer's "site last updated" date
document.addEventListener("DOMContentLoaded", function () {
  const stamp = document.getElementById("last-updated");
  if (!stamp) return;

  const updated = new Date(document.lastModified);
  stamp.dateTime = updated.toISOString();
  stamp.textContent = updated.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});
