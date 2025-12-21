// Test Website Manager functionality
console.log("🧪 Testing Website Manager...\n");

async function testWebsiteManager() {
  const token = localStorage.getItem("token");

  if (!token) {
    console.error("❌ No token found. Please login first.");
    return;
  }

  console.log("✅ Token found");

  // Test 1: Get config
  console.log("\n📥 Test 1: Fetch config...");
  try {
    const res = await fetch("/api/website-config", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log(
      "✅ Config fetched:",
      data.exists ? "Config exists" : "No config yet"
    );
  } catch (e) {
    console.error("❌ Failed to fetch config:", e.message);
  }

  // Test 2: AI Generate Config
  console.log("\n🤖 Test 2: AI Generate Config...");
  try {
    const res = await fetch("/api/website-config/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ genre: "Romance" }),
    });
    const data = await res.json();
    if (data.config) {
      console.log("✅ AI generated config successfully");
      console.log(
        "   Website name:",
        data.config.general?.websiteName || "N/A"
      );
    } else {
      console.error("❌ No config in response");
    }
  } catch (e) {
    console.error("❌ Failed to generate config:", e.message);
  }

  // Test 3: Save config
  console.log("\n💾 Test 3: Save Config...");
  try {
    const testConfig = {
      general: { websiteName: "Test Writer Site" },
      hero: { title: "Test Title" },
      dossier: { biography: "Test Bio" },
      social: { twitter: "#testwriter" },
    };

    const res = await fetch("/api/website-config", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ config: testConfig }),
    });

    const data = await res.json();
    if (data.success) {
      console.log("✅ Config saved successfully");
    } else {
      console.error("❌ Save failed:", data.error);
    }
  } catch (e) {
    console.error("❌ Failed to save config:", e.message);
  }

  // Test 4: Test UI elements
  console.log("\n🎨 Test 4: UI Elements...");
  const tabs = document.querySelectorAll(".tab-btn");
  console.log(tabs.length >= 3 ? "✅" : "❌", `Tabs found: ${tabs.length}`);

  const configTab = document.getElementById("tab-config");
  console.log(configTab ? "✅" : "❌", "Config tab exists");

  const genBtn = document.getElementById("generateConfigBtn");
  console.log(genBtn ? "✅" : "❌", "Generate button exists");

  const saveBtn = document.getElementById("saveConfigBtn");
  console.log(saveBtn ? "✅" : "❌", "Save button exists");

  console.log("\n✅ All tests completed!");
}

// Run tests
setTimeout(testWebsiteManager, 1000);
