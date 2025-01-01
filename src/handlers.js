

// TABS


const TAB_NAME_PREFIX = "tab-";


const TABS = []
const TAB_BUTTONS = document.getElementsByClassName("tab-button")


function closeTab(tab) {
    if (tab.style.display != "none") {
        tab._old_style_display = tab.style.display
        tab.style.display = "none"; // Hide the tab
        tab.style.visibility = "hidden";
    }

    tab.button.classList.remove("selected"); // Unselect the tab button
}


function closeAllTabs() {
    for (const tab of TABS) {
        closeTab(tab);
    }
}



function openTab(tab) {
    closeAllTabs(); // Make sure we are the only opened tab.
    if (tab.style.display == "none") {
        tab.style.display = tab._old_style_display || "flex"; // Show the tab.
        tab.style.visibility = "visible";
    }

    tab.button.classList.add("selected"); // Select the tab button.
}


for (const button of TAB_BUTTONS) {
    const name = button.id.split("-")[0];
    const tabName = TAB_NAME_PREFIX + name
    const tab = document.getElementById(tabName)
    tab.button = button;
    tab.file = name + ".js";

    const tabStyle = document.createElement("link");
    tabStyle.rel = "stylesheet";
    tabStyle.href = "styles/tabs/" + name + ".css";
    document.head.appendChild(tabStyle);

    const tabScript = document.createElement("script");
    tabScript.type = "module";
    tabScript.src = "src/tabs/" + name + ".js";
    document.head.appendChild(tabScript);


    button.addEventListener("click", () => {
        openTab(tab);
    })

    TABS.push(tab)

    if (TABS.length == 1) { // Keep the first tab open (the default one)
        openTab(tab);
    } else {
        closeTab(tab); // Make sure all other tabs are closed as well.
    }
}

// Make sure the tabs div is visible
document.getElementById("tabs").style.display = "flex";


// THEME TOGGLE BUTTON

document.getElementById("theme-toggle-button").addEventListener("click", () => {
    const darkMode = document.documentElement.classList.toggle('dark-scheme');
    document.getElementById("theme-toggle-button").innerHTML = darkMode
        	? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});
