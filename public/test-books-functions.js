// Test script untuk verify books.html functionality
console.log("🧪 Starting Books.html Function Tests...\n");

const tests = {
  passed: 0,
  failed: 0,
  results: [],
};

function assert(condition, message) {
  if (condition) {
    tests.passed++;
    tests.results.push(`✅ PASS: ${message}`);
    console.log(`✅ ${message}`);
  } else {
    tests.failed++;
    tests.results.push(`❌ FAIL: ${message}`);
    console.error(`❌ ${message}`);
  }
}

// Test 1: Verify openFeature function exists
assert(typeof openFeature === "function", "openFeature function is defined");

// Test 2: Verify closeComingSoon function exists
assert(
  typeof closeComingSoon === "function",
  "closeComingSoon function is defined"
);

// Test 3: Verify modal element exists
const modal = document.getElementById("comingSoonModal");
assert(modal !== null, "Coming Soon modal element exists in DOM");

// Test 4: Verify modal has hidden class initially
assert(
  modal && modal.classList.contains("hidden"),
  "Modal is hidden by default"
);

// Test 5: Test openFeature function
if (typeof openFeature === "function") {
  try {
    openFeature("kelola-website");
    const isVisible = !modal.classList.contains("hidden");
    assert(isVisible, "Modal opens when openFeature is called");

    const title = document.getElementById("comingSoonTitle");
    assert(
      title && title.textContent === "Kelola Website Penulis",
      "Modal title is set correctly"
    );

    closeComingSoon();
  } catch (e) {
    assert(false, "openFeature throws no errors: " + e.message);
  }
}

// Test 6: Test closeComingSoon function
if (typeof closeComingSoon === "function") {
  try {
    openFeature("modul-ajar");
    closeComingSoon();
    const isHidden = modal.classList.contains("hidden");
    assert(isHidden, "Modal closes when closeComingSoon is called");
  } catch (e) {
    assert(false, "closeComingSoon throws no errors: " + e.message);
  }
}

// Test 7: Verify all feature keys have titles
const featureKeys = [
  "kelola-website",
  "modul-ajar",
  "nonfksi",
  "ilmiah",
  "chatstory",
  "medsos",
  "editor",
];
featureKeys.forEach((key) => {
  openFeature(key);
  const title = document.getElementById("comingSoonTitle");
  assert(title && title.textContent.length > 0, `Feature '${key}' has a title`);
  closeComingSoon();
});

// Test 8: Verify grid structure
const grid = document.querySelector(".books-grid");
assert(grid !== null, "Books grid container exists");

// Test 9: Verify book cards
const cards = document.querySelectorAll(".book-card");
assert(
  cards.length >= 12,
  `At least 12 book cards present (found ${cards.length})`
);

// Test 10: Verify sections
const sections = document.querySelectorAll(".book-section");
assert(
  sections.length >= 3,
  `At least 3 sections present (found ${sections.length})`
);

// Test 11: Verify active menu item
const activeMenu = document.querySelector(".menu-item.active");
assert(
  activeMenu && activeMenu.getAttribute("href") === "books.html",
  "Books menu item is active"
);

// Test 12: Verify links to existing features
const existingFeatureLinks = [
  { selector: 'a[onclick*="cerpen.html"]', name: "Cerpen" },
  { selector: 'a[onclick*="scenario.html"]', name: "Skenario" },
  { selector: 'a[onclick*="chat.html"]', name: "Chat" },
  { selector: 'a[onclick*="novel/create.html"]', name: "Novel" },
  { selector: 'a[onclick*="rewrite.html"]', name: "Rewrite" },
];

existingFeatureLinks.forEach(({ selector, name }) => {
  const link = document.querySelector(selector);
  assert(link !== null, `Link to ${name} exists`);
});

// Summary
console.log("\n" + "=".repeat(50));
console.log("📊 TEST SUMMARY");
console.log("=".repeat(50));
console.log(`✅ Passed: ${tests.passed}`);
console.log(`❌ Failed: ${tests.failed}`);
console.log(
  `📈 Success Rate: ${(
    (tests.passed / (tests.passed + tests.failed)) *
    100
  ).toFixed(1)}%`
);
console.log("=".repeat(50));

if (tests.failed === 0) {
  console.log("\n🎉 ALL TESTS PASSED! Books.html is working correctly.");
} else {
  console.warn("\n⚠️ Some tests failed. Please review the errors above.");
}
