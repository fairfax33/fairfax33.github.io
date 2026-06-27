//Behavior shared by every page across the site
document.addEventListener("DOMContentLoaded", function () {
  markActiveNavigationLink();
  stampCopyrightYear();
});

//Underlines the link that matches the page currently being viewed
function markActiveNavigationLink() {
  const currentFile = window.location.pathname.split("/").pop() || "index.html";
  const navigationLinks = document.querySelectorAll(".site-nav a");

  navigationLinks.forEach(function (link) {
    if (link.getAttribute("href") === currentFile) {
      link.classList.add("is-current");
    }
  });
}

//Fill any element marked with data-current-year
function stampCopyrightYear() {
  const yearHolders = document.querySelectorAll("[data-current-year]");
  const currentYear = new Date().getFullYear();

  yearHolders.forEach(function (holder) {
    holder.textContent = currentYear;
  });
}
