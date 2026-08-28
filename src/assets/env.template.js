(function(window) {
  window.env = window.env || {};

  // Verifier API: relative path (same origin, Atlassian-style)
  window["env"]["api_base_url"] = "${API_BASE_URL}";

})(this);
