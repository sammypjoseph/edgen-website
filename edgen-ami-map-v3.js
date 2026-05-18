/* EdGen 2026 300% AMI county map. Requires D3 v7 and topojson-client v3. */
(function () {
  function setFallback(message, details) {
    const infoEl = document.getElementById("edgenAmiMapInfo");
    if (infoEl) {
      infoEl.innerHTML = `
        <p class="mini-eyebrow">Map unavailable</p>
        <h3>${message}</h3>
        <p>${details}</p>
      `;
    }
  }

  if (!window.d3 || !window.topojson) {
    setFallback(
      "Eligibility map could not load.",
      "Please confirm the D3 and topojson script tags were added above edgen-ami-map-v3.js near the bottom of index.html."
    );
    return;
  }

  const svg = d3.select("#edgenAmiMap");
  const tooltip = d3.select("#edgenAmiMapTooltip");
  const info = d3.select("#edgenAmiMapInfo");
  const searchInput = document.getElementById("edgenCountySearch");
  const datalist = document.getElementById("edgenCountyOptions");
  const legend = d3.select("#edgenAmiMapLegend");

  if (svg.empty()) return;

  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });

  const stateNames = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico"
  };

  function thresholdLabel(d) {
    if (!d) return "Data unavailable";
    if (d.varies && d.thresholdMin !== d.thresholdMax) {
      return `${fmt.format(d.thresholdMin)} – ${fmt.format(d.thresholdMax)}`;
    }
    return fmt.format(d.thresholdMax || d.value);
  }

  function displayName(d) {
    return `${d.county}, ${d.state}`;
  }

  function infoHtml(d) {
    if (!d) {
      return `
        <p class="mini-eyebrow">Hover or search</p>
        <h3>Select a county</h3>
        <p>Move your mouse over the map, or type a county and state like “Nassau County, NY.”</p>
      `;
    }
    const areas = (d.hudAreas || []).slice(0, 4).map(a => `<li>${a}</li>`).join("");
    const varies = d.varies ? `<p><strong>Note:</strong> HUD reports more than one income area inside this county, so the value is shown as a range.</p>` : "";
    const areasBlock = areas ? `<p>HUD income area${d.hudAreaCount > 1 ? "s" : ""}:</p><ul>${areas}</ul>` : "";
    return `
      <p class="mini-eyebrow">2026 HUD Income Data</p>
      <h3>${d.county}, ${d.state}</h3>
      <div class="threshold">
        <span>Estimated 300% AMI threshold</span>
        <strong>${thresholdLabel(d)}</strong>
      </div>
      ${varies}
      ${areasBlock}
    `;
  }

  function multipleMatchesHtml(matches) {
    return `
      <p class="mini-eyebrow">Multiple matches</p>
      <h3>Select the county you meant</h3>
      <p>There is more than one county with that name. Choose the correct state below.</p>
      <div class="ami-match-list">
        ${matches.slice(0, 12).map(m => `<button type="button" class="ami-match-button" data-geoid="${m.geoid}">${displayName(m)}</button>`).join("")}
      </div>
    `;
  }

  function tooltipHtml(d) {
    if (!d) return `<strong>County data unavailable</strong><span>HUD value not found</span>`;
    return `<strong>${d.county}, ${d.state}</strong><span>300% AMI: ${thresholdLabel(d)}</span>`;
  }

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  Promise.all([
    d3.json("edgen-ami-2026.json"),
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json")
  ]).then(([amiData, us]) => {
    const records = amiData.records || {};
    const values = Object.values(records).map(d => d.value).filter(Boolean).sort((a, b) => a - b);
    const min = d3.min(values) || 0;
    const max = d3.max(values) || 1;

    const colors = ["#dbe8ff", "#aecaef", "#7ea7e6", "#3f75d7", "#0038B8", "#071f4f"];
    const color = d3.scaleQuantize().domain([min, max]).range(colors);

    const countiesFeature = topojson.feature(us, us.objects.counties);
    const counties = countiesFeature.features;
    const statesMesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b);

    // IMPORTANT: us-atlas uses geographic coordinates. Project it into the SVG viewBox
    // so the county paths actually appear at the correct size on the page.
    const projection = d3.geoAlbersUsa().fitSize([975, 610], countiesFeature);
    const path = d3.geoPath(projection);

    svg.selectAll("*").remove();

    const countySelection = svg.append("g")
      .selectAll("path")
      .data(counties)
      .join("path")
      .attr("class", "edgen-county")
      .attr("d", path)
      .attr("fill", d => {
        const geoid = String(d.id).padStart(5, "0");
        const rec = records[geoid];
        return rec ? color(rec.value) : "#edf1f7";
      })
      .on("mousemove", function (event, d) {
        const geoid = String(d.id).padStart(5, "0");
        const rec = records[geoid];
        d3.select(this).classed("is-active", true);
        const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
        tooltip
          .style("opacity", 1)
          .style("left", (event.clientX - rect.left) + "px")
          .style("top", (event.clientY - rect.top) + "px")
          .html(tooltipHtml(rec));
      })
      .on("mouseleave", function () {
        d3.select(this).classed("is-active", false);
        tooltip.style("opacity", 0);
      })
      .on("click", function (event, d) {
        const geoid = String(d.id).padStart(5, "0");
        const rec = records[geoid];
        selectRecord(rec);
      });

    svg.append("path")
      .datum(statesMesh)
      .attr("class", "edgen-state-boundary")
      .attr("d", path);

    const thresholds = color.thresholds();
    const legendItems = colors.map((c, i) => {
      const low = i === 0 ? min : thresholds[i - 1];
      return { c, label: `${fmt.format(low)}+` };
    });

    legend.selectAll("span")
      .data(legendItems)
      .join("span")
      .html(d => `<i style="background:${d.c}"></i>${d.label}`);

    const searchable = Object.values(records)
      .sort((a, b) => `${a.county} ${a.state}`.localeCompare(`${b.county} ${b.state}`));

    const byGeoid = new Map(searchable.map(d => [d.geoid, d]));

    if (datalist) {
      datalist.innerHTML = searchable
        .map(d => `<option value="${displayName(d)}"></option>`)
        .join("");
    }

    function activateCounty(geoid) {
      countySelection.classed("is-active", false);
      countySelection
        .filter(d => String(d.id).padStart(5, "0") === geoid)
        .classed("is-active", true)
        .raise();
    }

    function selectRecord(rec) {
      if (!rec) {
        info.html(infoHtml(null));
        return;
      }
      info.html(infoHtml(rec));
      activateCounty(rec.geoid);
      if (searchInput) searchInput.value = displayName(rec);
    }

    function findMatches(q) {
      const nq = norm(q);
      if (!nq) return [];

      const exactDisplay = searchable.filter(d => norm(displayName(d)) === nq);
      if (exactDisplay.length) return exactDisplay;

      const commaMatch = nq.match(/^(.+?),\s*([a-z]{2}|[a-z ]+)$/);
      if (commaMatch) {
        const countyPart = norm(commaMatch[1]);
        const statePart = norm(commaMatch[2]);
        const matchedByState = searchable.filter(d => {
          const county = norm(d.county);
          const state = norm(d.state);
          const stateName = norm(d.stateName || stateNames[d.state]);
          return county.includes(countyPart) && (state === statePart || stateName.includes(statePart));
        });
        if (matchedByState.length) return matchedByState;
      }

      const countyExact = searchable.filter(d => norm(d.county) === nq || norm(d.county.replace(/ County$/i, "")) === nq);
      if (countyExact.length) return countyExact;

      return searchable.filter(d => {
        const combined = norm(`${d.county} ${d.state} ${d.stateName || stateNames[d.state]} ${displayName(d)}`);
        return combined.includes(nq);
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim();
        countySelection.classed("is-active", false);
        tooltip.style("opacity", 0);
        if (!q) {
          info.html(infoHtml(null));
          return;
        }
        const matches = findMatches(q);
        if (matches.length === 1) {
          selectRecord(matches[0]);
        } else if (matches.length > 1) {
          info.html(multipleMatchesHtml(matches));
        } else {
          info.html(`
            <p class="mini-eyebrow">No match found</p>
            <h3>Try county and state</h3>
            <p>For example: “Nassau County, NY” or “Cook County, IL.”</p>
          `);
        }
      });

      info.on("click", function (event) {
        const button = event.target.closest(".ami-match-button");
        if (!button) return;
        const rec = byGeoid.get(button.getAttribute("data-geoid"));
        selectRecord(rec);
      });
    }

    info.html(infoHtml(null));
  }).catch(err => {
    console.error("EdGen AMI map failed to load", err);
    setFallback(
      "Eligibility map could not load.",
      "Please confirm edgen-ami-2026.json is uploaded, the D3/topojson scripts are present, and edgen-ami-map-v3.js is linked near the bottom of index.html."
    );
  });
})();
