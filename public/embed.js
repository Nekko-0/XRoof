(function () {
  var script = document.currentScript;
  if (!script) return;
  var contractorId = script.getAttribute("data-contractor");
  if (!contractorId) return;
  var host = script.getAttribute("data-host") || "https://xroof.io";

  // Parse UTM params from host page
  var params = new URLSearchParams(window.location.search);
  var utmSource = params.get("utm_source") || "";
  var utmMedium = params.get("utm_medium") || "";
  var utmCampaign = params.get("utm_campaign") || "";

  // Fetch branding then render
  fetch(host + "/api/widget/branding?contractor_id=" + contractorId)
    .then(function (r) { return r.json(); })
    .catch(function () { return { company_name: "", widget_color: "#059669", logo_url: "" }; })
    .then(function (b) {
      var color = b.widget_color || "#059669";
      var companyName = b.company_name || "";
      var logoUrl = b.logo_url || "";

      var wrapper = document.createElement("div");
      wrapper.id = "xroof-embed";
      var shadow = wrapper.attachShadow({ mode: "closed" });

      shadow.innerHTML = '<style>' +
        ':host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }' +
        '.xr-form-wrap { max-width: 480px; width: 100%; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); padding: 28px 24px; box-sizing: border-box; }' +
        '.xr-header { text-align: center; margin-bottom: 20px; }' +
        '.xr-logo { height: 40px; max-width: 180px; object-fit: contain; margin-bottom: 8px; }' +
        '.xr-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin: 0 0 4px; }' +
        '.xr-subtitle { font-size: 14px; color: #666; margin: 0; }' +
        '.xr-field { margin-bottom: 14px; }' +
        '.xr-label { display: block; font-size: 13px; font-weight: 600; color: #333; margin-bottom: 4px; }' +
        '.xr-input { width: 100%; padding: 10px 12px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 15px; box-sizing: border-box; transition: border-color 0.2s; outline: none; font-family: inherit; }' +
        '.xr-input:focus { border-color: ' + color + '; box-shadow: 0 0 0 3px ' + color + '22; }' +
        '.xr-hp { position: absolute; left: -9999px; }' +
        '.xr-btn { width: 100%; padding: 12px; background: ' + color + '; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; font-family: inherit; }' +
        '.xr-btn:hover { opacity: 0.9; }' +
        '.xr-btn:disabled { opacity: 0.6; cursor: not-allowed; }' +
        '.xr-error { color: #dc2626; font-size: 13px; margin-top: 8px; text-align: center; }' +
        '.xr-success { text-align: center; padding: 32px 16px; }' +
        '.xr-success-icon { font-size: 48px; margin-bottom: 12px; }' +
        '.xr-success-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin: 0 0 8px; }' +
        '.xr-success-text { font-size: 14px; color: #666; margin: 0; }' +
        '@media (max-width: 520px) { .xr-form-wrap { padding: 20px 16px; border-radius: 8px; } }' +
      '</style>' +
      '<div class="xr-form-wrap">' +
        '<div class="xr-header">' +
          (logoUrl ? '<img class="xr-logo" src="' + logoUrl + '" alt="' + companyName + '">' : '') +
          '<h3 class="xr-title">Get Your Free Estimate</h3>' +
          (companyName ? '<p class="xr-subtitle">Powered by ' + companyName + '</p>' : '') +
        '</div>' +
        '<form id="xr-lead-form" novalidate>' +
          '<div class="xr-field"><label class="xr-label" for="xr-name">Full Name *</label><input class="xr-input" id="xr-name" name="name" required autocomplete="name" placeholder="John Smith"></div>' +
          '<div class="xr-field"><label class="xr-label" for="xr-phone">Phone *</label><input class="xr-input" id="xr-phone" name="phone" type="tel" required autocomplete="tel" placeholder="(555) 123-4567"></div>' +
          '<div class="xr-field"><label class="xr-label" for="xr-email">Email</label><input class="xr-input" id="xr-email" name="email" type="email" autocomplete="email" placeholder="john@example.com"></div>' +
          '<div class="xr-field"><label class="xr-label" for="xr-address">Property Address *</label><input class="xr-input" id="xr-address" name="address" required autocomplete="street-address" placeholder="123 Main St, Milwaukee, WI"></div>' +
          '<input class="xr-hp" name="website" tabindex="-1" autocomplete="off">' +
          '<button class="xr-btn" type="submit">Request Free Quote</button>' +
          '<div class="xr-error" id="xr-error" style="display:none"></div>' +
        '</form>' +
      '</div>';

      var form = shadow.getElementById("xr-lead-form");
      var errorEl = shadow.getElementById("xr-error");

      form.addEventListener("submit", function (e) {
        e.preventDefault();

        // Honeypot check
        var hp = form.querySelector('input[name="website"]');
        if (hp && hp.value) return;

        var name = form.querySelector('input[name="name"]').value.trim();
        var phone = form.querySelector('input[name="phone"]').value.trim();
        var email = form.querySelector('input[name="email"]').value.trim();
        var address = form.querySelector('input[name="address"]').value.trim();

        if (!name || !phone || !address) {
          errorEl.textContent = "Please fill in all required fields.";
          errorEl.style.display = "block";
          return;
        }

        var btn = form.querySelector(".xr-btn");
        btn.disabled = true;
        btn.textContent = "Submitting...";
        errorEl.style.display = "none";

        var payload = {
          contractor_id: contractorId,
          name: name,
          phone: phone,
          address: address,
          source_type: "embed_form"
        };
        if (email) payload.email = email;
        if (utmSource) payload.utm_source = utmSource;
        if (utmMedium) payload.utm_medium = utmMedium;
        if (utmCampaign) payload.utm_campaign = utmCampaign;

        fetch(host + "/api/lp/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
          .then(function (r) {
            if (!r.ok) throw new Error("Request failed");
            // Show success state
            var wrap = shadow.querySelector(".xr-form-wrap");
            wrap.innerHTML =
              '<div class="xr-success">' +
                '<div class="xr-success-icon">\u2705</div>' +
                '<h3 class="xr-success-title">Quote Request Received!</h3>' +
                '<p class="xr-success-text">We\'ll be in touch shortly to schedule your free estimate.</p>' +
              '</div>';
          })
          .catch(function () {
            errorEl.textContent = "Something went wrong. Please try again or call us directly.";
            errorEl.style.display = "block";
            btn.disabled = false;
            btn.textContent = "Request Free Quote";
          });
      });

      script.parentNode.insertBefore(wrapper, script.nextSibling);
    });
})();
