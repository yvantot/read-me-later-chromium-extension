// A very confusing scenario but this extension doesn't work properly without a content script.
// Yes, even if it's empty. I tried everything; modifying the manifest file, removing this file, hunting dependencies on this file-- but none
// The issue is the favicon doesn't load properly, and Chromium browsers are throwing an error, stating that I need permissions.
