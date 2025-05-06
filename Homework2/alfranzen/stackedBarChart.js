/**
 * Creates a Stacked Bar Chart showing Pokémon distribution by Primary & Secondary Type.
 * @param {Array<Object>} data - The processed Pokemon dataset. Each object is expected
 * to have `Type_1` and `Type_2` properties.
 * @param {string} containerId - The CSS selector for the HTML div where the chart will be rendered.
 */
export function createStackedBarChart(data, containerId) {
    /**
     * @const {d3.Selection} container - D3 selection for the chart's container element.
     */
    const container = d3.select(containerId);
    if (container.empty()) {
        console.error(`Container element "${containerId}" not found.`);
        return;
    }
    // Clear all previous content (SVG or HTML messages) from the container
    container.html(""); 

    /**
     * @const {number} BORDER_BOX_PADDING - Padding assumed for the container element if box-sizing is border-box.
     * This should match the padding set in CSS for .chart-container if you want to be precise.
     */
    const BORDER_BOX_PADDING = 5; // Adjust if your CSS padding for .chart-container changes
    /**
     * @const {number} containerWidth - The calculated width of the container, accounting for padding.
     */
    const containerWidth  = container.node().clientWidth  - BORDER_BOX_PADDING * 2;
    /**
     * @const {number} containerHeight - The calculated height of the container, accounting for padding.
     */
    const containerHeight = container.node().clientHeight - BORDER_BOX_PADDING * 2;

    // Check if container has valid dimensions (initial check for zero or negative container size)
    if (containerWidth <= 0 || containerHeight <= 0) {
         console.warn(`Container "${containerId}" has zero or negative dimensions (${containerWidth}x${containerHeight}). Cannot render chart.`);
         // This message is for when the container itself has no size.
         container.html(`<p style="color:orange; padding:10px;">Container has no size. Cannot draw chart.</p>`);
         return;
    }

    /**
     * @const {Object} margin - Margins for the chart within the SVG.
     * @property {number} top - Top margin.
     * @property {number} right - Right margin (increased for legend).
     * @property {number} bottom - Bottom margin.
     * @property {number} left - Left margin.
     */
    const margin = {top: 30, right: 120, bottom: 40, left: 70};

    // Calculate potential drawing dimensions based on container size and fixed margins
    let chartDrawingWidth = containerWidth - margin.left - margin.right;
    let chartDrawingHeight = containerHeight - margin.top - margin.bottom;

    // Log a warning if the container is too small for the defined margins,
    // but still attempt to render if possible.
    if (chartDrawingWidth <= 0 || chartDrawingHeight <= 0) {
        console.warn(`Container for "${containerId}" is smaller than defined margins. Chart will be cramped. Calculated drawing area before clamping: ${chartDrawingWidth}x${chartDrawingHeight}. Container: ${containerWidth}x${containerHeight}`);
    }

    // Ensure actual width and height for scales are at least 1px to prevent D3 errors.
    // The chart might not be visually useful at 1px, but it won't break the rendering flow.
    /**
     * @const {number} width - The final width of the chart drawing area (inside margins), clamped to be at least 1.
     */
    const width = Math.max(1, chartDrawingWidth);
    /**
     * @const {number} height - The final height of the chart drawing area (inside margins), clamped to be at least 1.
     */
    const height = Math.max(1, chartDrawingHeight);

    /**
     * @const {d3.Selection} svg - The main SVG group element, translated by the defined margins.
     * ViewBox is set on the parent SVG for responsive scaling.
     */
    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
         .attr("preserveAspectRatio", "xMidYMid meet")
         .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Log rendered SVG size for debugging (optional)
    // const svgEl = container.select("svg").node();
    // const rect = svgEl.getBoundingClientRect();
    // console.log(`StackedBarChart ${containerId} SVG rendered size: ${Math.round(rect.width)}×${Math.round(rect.height)}px`);

    // --- Data Processing for this chart ---
    /**
     * @const {string[]} primaryTypes - Sorted array of unique Pokémon primary types.
     */
    const primaryTypes = [...new Set(data.map(d => d.Type_1))].sort();
    /**
     * @const {string[]} secondaryTypes - Sorted array of unique Pokémon secondary types, with "None" first.
     * This order is important for the stack generator and color scale.
     */
    const secondaryTypes = [...new Set(data.map(d => d.Type_2))]
                           .sort((a, b) => a === "None" ? -1 : b === "None" ? 1 : a.localeCompare(b));

    /**
     * @const {Map<string, Object>} countsByType - A Map where keys are primary types and values are objects
     * containing counts for each secondary type, plus a 'total' count for that primary type.
     */
    const countsByType = d3.rollup(data,
        leaves => {
            const counts = Object.fromEntries(secondaryTypes.map(secType => [secType, 0]));
            leaves.forEach(leaf => {
                 if(counts[leaf.Type_2] !== undefined){
                     counts[leaf.Type_2]++;
                 } else {
                     // This case should ideally not happen if data is clean and secondaryTypes includes all possibilities
                     console.warn(`Unexpected secondary type: ${leaf.Type_2} for primary type ${leaf.Type_1} in ${containerId}. It might not be included in the 'secondaryTypes' array.`);
                 }
            });
            counts.total = leaves.length;
            return counts;
        },
        d => d.Type_1
    );

    /**
     * @const {Array<Object>} sortedCountsArray - An array of objects derived from `countsByType`,
     * sorted by the total number of Pokémon per primary type in descending order.
     * Each object includes `primaryType` and counts for each `secondaryType`.
     */
    const sortedCountsArray = Array.from(countsByType.entries())
        .sort(([,a], [,b]) => b.total - a.total)
        .map(([primaryType, counts]) => ({ primaryType, ...counts }));

    /**
     * @const {string[]} sortedPrimaryTypes - Array of primary type names, sorted based on `sortedCountsArray`
     * (i.e., by total Pokémon count per primary type). Used for the Y-axis domain.
     */
    const sortedPrimaryTypes = sortedCountsArray.map(d => d.primaryType);

    // --- Stacking ---
    /**
     * @const {d3.Stack} stack - D3 stack generator configured with `secondaryTypes` as keys.
     */
    const stack = d3.stack()
        .keys(secondaryTypes)
        .order(d3.stackOrderNone) // Keeps the order of primary types as provided
        .offset(d3.stackOffsetNone); // Starts bars from zero

    /**
     * @const {Array<Array<Array<number>>>} series - The stacked data series generated by `stack(sortedCountsArray)`.
     * Each inner array represents a secondary type layer, containing segments for each primary type.
     */
    const series = stack(sortedCountsArray);

     if (series.length === 0 || sortedCountsArray.length === 0) {
        console.warn(`No data available for stacking in ${containerId}`);
        svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor","middle").text("No data for Stacked Bar Chart.");
        return;
    }

    // --- Scales ---
    /**
     * @const {number|undefined} maxTotal - The maximum total count of Pokémon for any single primary type.
     * Used for the X-axis domain.
     */
    const maxTotal = d3.max(sortedCountsArray, d => d.total);
     if (maxTotal === undefined || maxTotal <= 0) { // Check if maxTotal is valid
        console.warn(`Max total count for ${containerId} is invalid or zero: ${maxTotal}. Cannot create xScale domain.`);
        svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor","middle").text("No valid data counts for chart scale.");
        return;
    }
    /**
     * @const {d3.ScaleLinear} xScale - D3 linear scale for the X-axis (Number of Pokémon).
     */
    const xScale = d3.scaleLinear()
        .domain([0, maxTotal])
        .range([0, width])
        .nice();

    /**
     * @const {d3.ScaleBand} yScale - D3 band scale for the Y-axis (Primary Types).
     */
    const yScale = d3.scaleBand()
        .domain(sortedPrimaryTypes)
        .range([0, height])
        .paddingInner(0.1)
        .paddingOuter(0.1);

    /**
     * @const {d3.ScaleOrdinal} colorScale - D3 ordinal scale for coloring bars by secondary type.
     * Uses a combination of D3 schemes to provide enough distinct colors.
     */
    const colorScale = d3.scaleOrdinal()
        .domain(secondaryTypes) // Domain is all secondary types, including "None"
        .range(d3.schemeCategory10.concat(d3.schemeSet3).slice(0, secondaryTypes.length));

    // --- Axes ---
    /**
     * @const {d3.Axis} xAxis - D3 axis generator for the X-axis.
     */
    const xAxis = d3.axisBottom(xScale).ticks(Math.max(2, Math.floor(width / 80))); // Dynamic ticks
    /**
     * @const {d3.Axis} yAxis - D3 axis generator for the Y-axis.
     */
    const yAxis = d3.axisLeft(yScale);

    svg.append("g").attr("class", "x axis").attr("transform", `translate(0, ${height})`).call(xAxis);
    svg.append("g").attr("class", "y axis").call(yAxis);

    // Axis Labels & Title
    svg.append("text") .attr("class", "axis-label") .attr("x", width / 2) .attr("y", height + margin.bottom - 5).style("text-anchor", "middle").text("Number of Pokémon");
    svg.append("text") .attr("class", "axis-label") .attr("transform", "rotate(-90)") .attr("x", -height / 2) .attr("y", -margin.left + 15).style("text-anchor", "middle").text("Primary Type");
    svg.append("text") .attr("x", width / 2) .attr("y", 0 - (margin.top / 2)) .attr("text-anchor", "middle") .style("font-size", "14px") .style("text-decoration", "underline") .text("Pokémon Distribution by Primary & Secondary Type");

    // --- Drawing Bars ---
    /**
     * @const {d3.Selection} layers - D3 selection of groups, one for each secondary type layer in the stack.
     * Each group is filled with the color corresponding to its secondary type.
     */
     const layers = svg.append("g")
       .selectAll("g.layer")
       .data(series)
       .enter().append("g")
         .attr("class", "layer")
         .attr("fill", d => colorScale(d.key)); // d.key is the secondary type

     // Append rectangles for each segment in each layer
     layers.selectAll("rect")
       .data(d => d.filter(segment => !isNaN(segment[0]) && !isNaN(segment[1]) && (segment[1] - segment[0] > 0) )) // Filter valid segments
       .enter().append("rect")
         .attr("class", "stacked-bar-rect")
         .attr("y", d => yScale(d.data.primaryType))
         .attr("x", d => xScale(d[0])) // d[0] is the start of the segment
         .attr("width", d => {
              const w = xScale(d[1]) - xScale(d[0]); // d[1] is the end of the segment
              return isNaN(w) || w < 0 ? 0 : w; // Ensure width is non-negative
          })
         .attr("height", yScale.bandwidth())
       .append("title") // Tooltip
         .text(function(d_segment) { // d_segment is the data for one bar segment
             // The key for the layer (secondary type) is on the parent <g class="layer">
             const layerGroup = d3.select(this.parentNode.parentNode);
             const secondaryType = layerGroup.datum() ? layerGroup.datum().key : 'Unknown';
             const primaryType = d_segment.data.primaryType;
             const count = d_segment.data[secondaryType]; // Get count from original data object
             const countText = (count !== undefined && !isNaN(count)) ? count : 'N/A';
             return `${primaryType} / ${secondaryType}: ${countText}`;
         });

    // --- Legend ---
    /**
     * @const {d3.Selection} legend - D3 selection for the legend group element.
     * Positioned to the right of the main chart area.
     */
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 10}, 0)`); // Positioned relative to the (potentially small) chart width

    // Conditionally hide legend if the original calculated chart drawing width was too small
    // Use chartDrawingWidth (before clamping) to decide if there's conceptually enough space
    if (chartDrawingWidth < 50) { // Threshold: if intended chart area was less than 50px wide
        legend.style("display", "none");
        console.warn(`Hiding legend for ${containerId} due to very small chart drawing width (${chartDrawingWidth}px).`);
    } else {
        /** @const {number} legendItemHeight - Height of each individual legend item. */
        const legendItemHeight = 15;
        /** @const {number} legendItemWidth - Width allocated for each legend item (for multi-column layout). */
        const legendItemWidth = 60; // Adjust based on typical length of type names
        /** @const {number} numColumns - Number of columns for the legend. */
        const numColumns = 2;
        /** @const {number} itemsPerColumn - Calculated number of items per legend column. */
        const itemsPerColumn = Math.ceil(secondaryTypes.length / numColumns);

        // Create legend items
        secondaryTypes.forEach((type, i) => {
            const columnIndex = Math.floor(i / itemsPerColumn);
            const rowIndex = i % itemsPerColumn;
            
            /**
             * @const {d3.Selection} legendItem - D3 selection for a single legend item group.
             */
            const legendItem = legend.append("g")
                .attr("class", "legend-item")
                .attr("transform", `translate(${columnIndex * legendItemWidth}, ${rowIndex * legendItemHeight})`);
            
            legendItem.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", colorScale(type));
            
            legendItem.append("text")
                .attr("x", 15) // Position text to the right of the color swatch
                .attr("y", 9) // Vertically align text with the color swatch (approx middle)
                .text(type);
        });
    }
}
