//Only the righthand panel switches across pages
//Back/forward buttons stay in sync via History API, and anything errors fall back to a normal page load

const homeTitle = document.title;
let contentPanel = null;
let homeMarkup = "";

document.addEventListener("DOMContentLoaded", () => {
  contentPanel = document.getElementById("content-panel");
  if (!contentPanel) return;

  homeMarkup = contentPanel.innerHTML;
  contentPanel.addEventListener("click", handleContentLinkClick);
  window.addEventListener("popstate", handleHistoryNavigation);
});

//Entry point the decoder calls once it has resolved a page's number.
async function navigateToPage(url) {
  if (url === "index.html") {
    //Home button returns to the landing view
    showHomeContent();
    history.pushState({}, "", "index.html");
    return;
  }

  const shown = await swapInPageContent(url);
  if (shown) history.pushState({ url }, "", url);
}

async function swapInPageContent(url) {
  const page = await fetchPageDocument(url);
  if (!page) {
    window.location.href = url;
    return false;
  }

  contentPanel.innerHTML =
    '<a class="content-home-link" href="index.html">← Micah Keegan</a>' +
    page.main.innerHTML;
  contentPanel.classList.add("is-page");
  document.title = page.title;
  window.scrollTo(0, 0);
  return true;
}

function showHomeContent() {
  contentPanel.innerHTML = homeMarkup;
  contentPanel.classList.remove("is-page");
  document.title = homeTitle;
  window.scrollTo(0, 0);
}

//Keep in-site links inside the panel (the home link and any links within a fetched page) as in-place swaps rather than full page loads.
function handleContentLinkClick(event) {
  const link = event.target.closest("a");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href || !href.endsWith(".html")) return;

  event.preventDefault();
  if (href === "index.html") {
    showHomeContent();
    history.pushState({}, "", "index.html");
  } else {
    navigateToPage(href);
  }
}

function handleHistoryNavigation() {
  const file = location.pathname.split("/").pop();
  if (!file || file === "index.html") showHomeContent();
  else swapInPageContent(file);
}

async function fetchPageDocument(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const doc = new DOMParser().parseFromString(
      await response.text(),
      "text/html"
    );
    const main = doc.querySelector("main");
    return main ? { main, title: doc.title } : null;
  } catch (error) {
    return null;
  }
}
