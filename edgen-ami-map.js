/* EdGen 2026 300% AMI county map. Requires D3 v7 and topojson-client v3. */
(function () {
  const svg = d3.select("#edgenAmiMap");
  const tooltip = d3.select("#edgenAmiMapTooltip");
  const info = d3.select("#edgenAmiMapInfo");
  const searchInput = document.getElementById("edgenCountySearch");
  const legend = d3.select("#edgenAmiMapLegend");

  if (svg.empty()) return;

  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });

  function thresholdLabel(d) {
    if (!d) return "Data unavailable";
    if (d.varies && d.thresholdMin !== d.thresholdMax) {
      return `${fmt.format(d.thresholdMin)} – ${fmt.format(d.thresholdMax)}`;
    }
    return fmt.format(d.thresholdMax || d.value);
  }

  function infoHtml(d) {
    if (!d) {
      return `
        <p class="mini-eyebrow">Hover or search</p>
        <h3>Select a county</h3>
        <p>Move your mouse over the map to see the 2026 300% AMI planning threshold for that county.</p>
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

  function tooltipHtml(d) {
    if (!d) return `<strong>County data unavailable</strong><span>HUD value not found</span>`;
    return `<strong>${d.county}, ${d.state}</strong><span>300% AMI: ${thresholdLabel(d)}</span>`;
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

    const counties = topojson.feature(us, us.objects.counties).features;
    const statesMesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b);
    const path = d3.geoPath();

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
        tooltip
          .style("opacity", 1)
          .style("left", event.offsetX + "px")
          .style("top", event.offsetY + "px")
          .html(tooltipHtml(rec));
      })
      .on("mouseleave", function () {
        d3.select(this).classed("is-active", false);
        tooltip.style("opacity", 0);
      })
      .on("click", function (event, d) {
        const geoid = String(d.id).padStart(5, "0");
        const rec = records[geoid];
        info.html(infoHtml(rec));
      });

    svg.append("path")
      .datum(statesMesh)
      .attr("class", "edgen-state-boundary")
      .attr("d", path);

    const thresholds = color.thresholds();
    const legendItems = colors.map((c, i) => {
      const low = i === 0 ? min : thresholds[i - 1];
      const high = i === colors.length - 1 ? max : thresholds[i];
      return { c, label: `${fmt.format(low).replace(/\.00$/, "")}+` };
    });

    legend.selectAll("span")
      .data(legendItems)
      .join("span")
      .html(d => `<i style="background:${d.c}"></i>${d.label}`);

    const searchable = Object.values(records)
      .sort((a, b) => `${a.county} ${a.state}`.localeCompare(`${b.county} ${b.state}`));

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        countySelection.classed("is-active", false);
        if (!q) {
          info.html(infoHtml(null));
          return;
        }
        const match = searchable.find(d =>
          `${d.county} ${d.state} ${d.stateName}`.toLowerCase().includes(q)
        );
        if (match) {
          info.html(infoHtml(match));
          countySelection
            .filter(d => String(d.id).padStart(5, "0") === match.geoid)
            .classed("is-active", true)
            .raise();
        }
      });
    }
  }).catch(err => {
    console.error("EdGen AMI map failed to load", err);
    info.html(`
      <p class="mini-eyebrow">Map unavailable</p>
      <h3>Eligibility map could not load.</h3>
      <p>Please confirm that edgen-ami-2026.json, D3, and topojson-client are loading correctly.</p>
    `);
  });
})();
