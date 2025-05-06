/**
 * Creates a Parallel Coordinates Plot showing relationships between numeric stats.
 * @param {Array<Object>} data - The processed Pokemon dataset. Each object is expected
 * to have properties corresponding to the `dimensions` array and `Type_1` for coloring.
 * @param {string} containerId - The CSS selector for the HTML div where the chart will be rendered.
 */
export function createParallelCoordinatesPlot(data, containerId) {
    const container = d3.select(containerId);
    // Clear previous SVG first

    // Get container dimensions dynamically
    const BORDER_BOX_PADDING = 15; // From .chart-container padding in style.css
    const currentWidth = container.node().clientWidth - (BORDER_BOX_PADDING * 2);
    const currentHeight = container.node().clientHeight - (BORDER_BOX_PADDING * 2);

    // Define margins
    const margin = {top: 100, right: 20, bottom: 60, left: 20}; // Adjust as needed
    const width = currentWidth - margin.left - margin.right;
    const height = currentHeight - margin.top - margin.bottom;

    // Create SVG 
    const svg = container.append("svg")
        // Set width/height for the element's space, but viewBox controls internal scaling
        .attr("viewBox", `0 0 ${currentWidth} ${currentHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet") 
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    /**
     * @const {string[]} dimensions - Array of Pokemon stats to be used as axes in the plot.
     */
    const dimensions = ['HP', 'Attack', 'Defense', 'Sp_Atk', 'Sp_Def', 'Speed'];

    // Filter data to include only Pokemon with valid values for all dimensions
    const filteredData = data.filter(d => dimensions.every(dim => d[dim] !== undefined && !isNaN(d[dim])));

     if (filteredData.length === 0) {
        console.warn(`No valid data found for Parallel Coordinates plot in ${containerId} after filtering NaNs.`);
        svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").text("No valid data for Parallel Coordinates.");
        return;
    }

    /**
     * @const {string[]} primaryTypes - Sorted list of unique primary types from the filtered data, used for the legend.
     */
    const primaryTypes = [...new Set(filteredData.map(d => d.Type_1))].sort();

    // --- Scales ---
    /**
     * @const {d3.ScalePoint} xScale - D3 scale for positioning the vertical axes along the horizontal width.
     */
    const xScale = d3.scalePoint()
        .domain(dimensions)
        .range([0, width])
        .padding(0.2); // Adjust padding between axes

    // --- Calculate Global Extent for Shared Y-Scale ---
    let globalMin = Infinity;
    let globalMax = -Infinity;
    let scaleError = false;

    filteredData.forEach(d => {
        dimensions.forEach(dim => {
            const value = d[dim];
            if (value !== undefined && !isNaN(value)) {
                if (value < globalMin) globalMin = value;
                if (value > globalMax) globalMax = value;
            } else {
                // This case should be less likely due to prior filtering, but good to check
                console.warn(`Invalid value found for ${dim} in Pokemon ${d.Name} during global extent calculation.`);
                // Decide if this constitutes an error preventing scale creation
                // scaleError = true;
            }
        });
    });

    // Check if a valid global extent was found
    if (globalMin === Infinity || globalMax === -Infinity) {
        console.error(`Could not determine valid global extent for dimensions in ${containerId} PCP.`);
        scaleError = true;
    }

    // --- Shared Y-Scale ---
    /**
     * @type {d3.ScaleLinear} yScale - D3 linear scale for mapping stat values to vertical positions on each axis.
     * Shared across all dimension axes.
     */
    let yScale; // Declare yScale variable

    if (!scaleError) {
        yScale = d3.scaleLinear()
            .domain([globalMin, globalMax]) // Use the calculated global min/max
            .range([height, 0]) // Inverted: 0 at bottom, max at top
            .nice(); // Extend domain slightly for better axis labels
    } else {
        // Handle error: display message and potentially stop
        console.error(`Failed to create shared Y scale for ${containerId} PCP due to invalid data.`);
        svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle")
           .text("Error: Invalid data for one or more stats.");
        return; // Stop drawing if scale fails
    }

    /**
     * @const {string[]} sharedColorDomain - Domain for the color scale, derived from Type_2 values
     * (including "None") to ensure color consistency with the stacked bar chart.
     */
    const sharedColorDomain = [...new Set(data.map(d => {
        // Normalize empty, null, or undefined Type_2 to "None"
        const type2 = d.Type_2;
        return (type2 === "" || type2 === null || type2 === undefined) ? "None" : type2;
    }))].sort((a, b) => {
        if (a === "None") return -1; // Ensure "None" is first
        if (b === "None") return 1;
        return a.localeCompare(b); // Sort other types alphabetically
    });

    /**
     * @const {d3.ScaleOrdinal} colorScale - D3 ordinal scale for coloring lines based on Pokémon's `Type_1`.
     * The domain is aligned with `sharedColorDomain` for consistency.
     */
    const palette = d3.schemeCategory10.concat(d3.schemeSet3);
    const colorScale = d3.scaleOrdinal()
        .domain(sharedColorDomain) // Use the comprehensive domain including "None"
        .range(palette.slice(0, sharedColorDomain.length)); // Slice range according to this new domain length

    // --- Drawing Axes ---
    const axes = svg.selectAll(".dimension")
        .data(dimensions)
        .enter().append("g")
            .attr("class", "dimension axis")
            .attr("transform", d => `translate(${xScale(d)}, 0)`) // Position axis group
        /**
         * Iterates over each dimension to draw its axis.
         * @param {string} dimName - The name of the current dimension (e.g., 'HP', 'Attack').
         */
        .each(function(dimName) { // Add axis generator to each group
             // Use the single yScale for all axes
             d3.select(this).call(d3.axisLeft(yScale).ticks(5)); // Draw the vertical axis
        });

    // Add Axis Labels (Dimension Names)
    axes.append("text")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .attr("y", -15) // Position above the axis ticks
        .attr("x", 0) // Centered horizontally relative to the axis group
        .text(d => d.replace('_', '. ')); // Format name nicely

     // Chart Title
     svg.append("text")
        .attr("x", width / 2)
        .attr("y", 0 - margin.top / 2) // Position above axes
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("text-decoration", "underline")
        .text("Pokémon Stat Comparison with Parallel Coordinates");


    // --- Drawing Lines (Paths) ---
    /**
     * Generates the SVG path string for a single Pokémon's line across all dimensions.
     * @param {Object} d - The data object for a single Pokémon.
     * @returns {string|null} The SVG path string, or null if the path is invalid/incomplete.
     */
    function path(d) {
        // Map each dimension to its [x, y] coordinate using the SINGLE yScale
        const points = dimensions.map(p => {
            // Check if data value is valid before getting coordinate
            const yVal = (d[p] !== undefined && !isNaN(d[p])) ? yScale(d[p]) : NaN; // Use shared yScale
            const xVal = xScale(p);
            // Return [NaN, NaN] if any part is invalid to filter later
            return [isNaN(xVal) || isNaN(yVal) ? NaN : xVal, isNaN(yVal) ? NaN : yVal];
        });

        // Filter out any points with NaN coordinates
        const validPoints = points.filter(pt => !isNaN(pt[0]) && !isNaN(pt[1]));

        // Only return a line if there are at least 2 valid points for the path
        // and all dimensions were valid for this Pokemon
        if (validPoints.length >= 2 && validPoints.length === dimensions.length) {
             return d3.line()(validPoints);
        }
        return null; // Return null if the path is invalid or incomplete
    }

    // Select the group for lines (or create if needed)
    const linesGroup = svg.append("g")
       .attr("class", "pcp-lines");

    // Draw the paths
    const paths = linesGroup.selectAll(".pokemon-path")
        .data(filteredData)
        .enter().append("path")
            .attr("class", "pcp-path pokemon-path") // Add pcp-path for styling
            .attr("d", path) // Generate path string
            .style("stroke", d => colorScale(d.Type_1)) // Color by primary type
            .style("fill", "none") // Ensure paths are not filled
            .style("stroke-width", 1.5) // Base stroke width
            .style("opacity", 0.3) // Make lines semi-transparent
            .style("display", d => path(d) ? null : "none"); // Hide path if path() returned null

    // Add Tooltip
    paths.append("title")
         .text(d => `${d.Name} (${d.Type_1}${d.Type_2 !== 'None' ? '/' + d.Type_2 : ''})\n` +
                    dimensions.map(dim => `${dim}: ${d[dim]}`).join('\n'));

    // Hover Interaction
    paths.on("mouseover", function(event, d) {
            /**
             * Handles mouseover event on a Pokémon path.
             * Highlights the hovered line and dims others.
             * @param {Event} event - The mouse event.
             * @param {Object} d - The data object for the hovered Pokémon.
             */
            // Highlight the hovered line
            d3.select(this)
              .raise() // Bring to front
              .style("stroke-width", 4)
              .style("opacity", 1);

            // Optionally dim other lines (can impact performance with many lines)
            linesGroup.selectAll(".pokemon-path").filter((p, i) => p !== d).style("opacity", 0.1);

        })
        .on("mouseout", function(event, d) {
            /**
             * Handles mouseout event on a Pokémon path.
             * Restores the original style of the previously hovered line and others.
             * @param {Event} event - The mouse event.
             * @param {Object} d - The data object for the previously hovered Pokémon.
             */
            // Restore original style
            d3.select(this)
              .style("stroke-width", 1.5)
              .style("opacity", 0.3); // Restore base opacity // Changed from 0.4 to match initial

            // Restore other lines if they were dimmed
            linesGroup.selectAll(".pokemon-path").filter((p, i) => p !== d).style("opacity", 0.3); // Changed from 0.4 to match initial
        });


    // --- Legend ---
    if (primaryTypes && primaryTypes.length > 0 && primaryTypes.length <= 18) { // Limit legend items
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(0, ${height + margin.bottom - 30})`) // Position below chart
            .attr("text-anchor", "start");

        const legendItemWidth = 80; // Adjust spacing as needed
        const itemsPerRow = Math.floor(width / legendItemWidth);
        

       // compute how tall the legend actually is
       const legendRows      = Math.ceil(primaryTypes.length / itemsPerRow);
       const legendHeight    = legendRows * 15; // 15px per row
       // if legend exceeds the space implicit in (margin.bottom - 20), grow viewBox
       if (legendHeight > (margin.bottom - 20)) {
         const svgEl   = container.select("svg");
         // Ensure currentHeight and currentWidth are available from the outer scope
         const newH    = currentHeight + (legendHeight - (margin.bottom - 20)); // Adjusted calculation
         svgEl.attr("viewBox", `0 0 ${currentWidth} ${newH}`);
       }

        const legendItem = legend.selectAll(".legend-item")
            .data(primaryTypes)
            .enter().append("g")
                .attr("class", "legend-item")
                .attr("transform", (d, i) => {
                    const row = Math.floor(i / itemsPerRow);
                    const col = i % itemsPerRow;
                    return `translate(${col * legendItemWidth}, ${row * 15})`; // Position in grid
                 });

        legendItem.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("y", -10) // Align with text baseline
            .attr("fill", d => colorScale(d));

        legendItem.append("text")
            .attr("x", 15)
            .attr("y", 0)
            .attr("dy", "-0.1em") // Fine-tune vertical alignment
            .text(d => d);

    } else if (primaryTypes.length > 18) {
         svg.append("text")
            .attr("class", "legend-note")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("font-style", "italic")
            .text(`Color represents Primary Type (${primaryTypes.length} types total). Legend omitted for clarity.`);
    } else {
         console.warn(`No primary types found for PCP legend in ${containerId}.`);
    }
}
