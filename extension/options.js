const $ = (s) => document.querySelector(s);
chrome.storage.sync.get(["apiBase"]).then(({ apiBase }) => {
  if (apiBase) $("#api").value = apiBase;
});
$("#save").addEventListener("click", async () => {
  const v = $("#api").value.trim();
  await chrome.storage.sync.set({ apiBase: v || undefined });
  $("#msg").textContent = "Saved.";
  setTimeout(() => ($("#msg").textContent = ""), 1500);
});
