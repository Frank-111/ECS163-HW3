let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

// Visualization 1: Bar Chart - Average Stats of a Legendary Pokemon
let statsLeft = width/2, statsTop = 0;
let statsMargin = {top: 50, right: 30, bottom: 80, left: 80},
    statsWidth = width/2 - statsMargin.left - statsMargin.right,
    statsHeight = height/2 - statsMargin.top - statsMargin.bottom;

// Visualization 2: Scatter Plot - Attack vs Special Attack for each Pokemon
let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 50, right: 30, bottom: 80, left: 80},
    scatterWidth = width/2 - scatterMargin.left - scatterMargin.right,
    scatterHeight = height/2 - scatterMargin.top - scatterMargin.bottom;

// Define Pokemon type colors
const typeColors = {
    "Bug": "#A8B820",
    "Dark": "#000000",
    "Dragon": "#7038F8",
    "Electric": "#F8D030",
    "Fairy": "#EE99AC",
    "Fighting": "#C03028",
    "Fire": "#F08030",
    "Flying": "#B3B3C8",
    "Ghost": "#705898",
    "Grass": "#78C850",
    "Ground": "#E0C068",
    "Ice": "#98D8D8",
    "Normal": "#A8A878",
    "Poison": "#A040A0",
    "Psychic": "#F85888",
    "Rock": "#B8A038",
    "Steel": "#B8B8D0",
    "Water": "#6890F0"
};

// plots
d3.csv("pokemon_alopez247.csv").then(rawData => {
    console.log("rawData", rawData);
    // Convert string values to numbers
    rawData.forEach(function(d) {
        d.HP = +d.HP;
        d.Attack = +d.Attack;
        d.Defense = +d.Defense;
        d.Sp_Atk = +d.Sp_Atk;
        d.Sp_Def = +d.Sp_Def;
        d.Speed = +d.Speed;
        d.Total = +d.Total;
        d.Generation = +d.Generation;
        d.Height_m = +d.Height_m;
        d.Weight_kg = +d.Weight_kg;
        d.Catch_Rate = +d.Catch_Rate;
        d.Number = +d.Number;
    });

    // Select the SVG element
    const svg = d3.select("svg");
    
    // Select the tooltip div that's already in the HTML
    const tooltip = d3.select("#tooltip");

    //-------------------------------------------------------------------
    // Visualization 1: Bar Graph - Average Stats of Legendary Pokemon
    //-------------------------------------------------------------------
    const g2 = svg.append("g")
        .attr("width", statsWidth + statsMargin.left + statsMargin.right)
        .attr("height", statsHeight + statsMargin.top + statsMargin.bottom)
        .attr("transform", `translate(${statsLeft + statsMargin.left}, ${statsTop + statsMargin.top})`);
    
    // Add title
    g2.append("text")
        .attr("x", statsWidth / 2)
        .attr("y", -20)
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .text("Bar Graph: Average Stats of Legendary Pokemon");

    // Filter for legendary Pokemon only
    const legendaryPokemon = rawData.filter(d => d.isLegendary === "True" || d.isLegendary === true);
    console.log(`Number of Legendary Pokemon: ${legendaryPokemon.length}`);

    // Log all legendary Pokemon
    console.log("List of Legendary Pokemon:");
    legendaryPokemon.forEach(pokemon => {
        console.log(`#${pokemon.Number} - ${pokemon.Name} (${pokemon.Type_1}${pokemon.Type_2 ? "/" + pokemon.Type_2 : ""})`);
    });
    
   // Calculate average stats for legendary Pokemon
    const statNames = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
    const displayNames = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"];

    const legendaryStats = statNames.map((stat, i) => {
    return {
        name: stat,
        displayName: displayNames[i],
        value: d3.mean(legendaryPokemon, d => d[stat])
    };
});

     // X scale for stats
    const x2 = d3.scaleBand()
        .domain(statNames)
        .range([0, statsWidth])
        .padding(0.3);

    // Y scale for average values
    const y2 = d3.scaleLinear()
        .domain([0, d3.max(legendaryStats, d => d.value) * 1.1]) // Add 10% padding on top
        .range([statsHeight, 0]);

  // X axis with nice display names
    g2.append("g")
        .attr("transform", `translate(0, ${statsHeight})`)
        .call(d3.axisBottom(x2).tickFormat((d, i) => displayNames[i]))
        .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Y axis
    g2.append("g")
        .call(d3.axisLeft(y2));

    // X label
    g2.append("text")
        .attr("x", statsWidth / 2)
        .attr("y", statsHeight + 50)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .text("Stat");

    // Y label
    g2.append("text")
        .attr("x", -statsHeight / 2)
        .attr("y", -50)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Average Value");

    // Add bars for each stat
    g2.selectAll("rect")
        .data(legendaryStats)
        .enter()
        .append("rect")
        .attr("x", d => x2(d.name))
        .attr("y", d => y2(d.value))
        .attr("width", x2.bandwidth())
        .attr("height", d => statsHeight - y2(d.value))
        .attr("fill", "steelblue") 
        .on("mouseover", function(d) {
            d3.select(this)
                .attr("opacity", 0.8);
                
            tooltip
                .style("opacity", 0.9)
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 28) + "px")
                .html(`<strong>Legendary Pokemon</strong><br>${d.name}: ${Math.round(d.value)}`);
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("opacity", 1);
                
            tooltip
                .style("opacity", 0);
        });

    // Add value labels on top of bars
    g2.selectAll(".text")
        .data(legendaryStats)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x2(d.name) + x2.bandwidth() / 2)
        .attr("y", d => y2(d.value) - 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text(d => Math.round(d.value));
        
    //-------------------------------------------------------------------
    // Visualization 2: Scatter Plot - Attack vs Special Attack
    //-------------------------------------------------------------------
    
// Create main group for the scatter plot
    const g1 = svg.append("g")
        .attr("transform", `translate(${scatterLeft + scatterMargin.left}, ${scatterTop + scatterMargin.top})`);
    
    // Add title
    g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Scatter Plot: Pokemon Attack vs. Special Attack");
    
    // X scale - Attack
    const x1 = d3.scaleLinear()
        .domain([0, d3.max(rawData, d => d.Attack) * 1.05])
        .range([0, scatterWidth]);
    
    // Y scale - Special Attack
    const y1 = d3.scaleLinear()
        .domain([0, d3.max(rawData, d => d.Sp_Atk) * 1.05])
        .range([scatterHeight, 0]);
    
    // X axis
    g1.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(d3.axisBottom(x1))
        .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");
    
    // Y axis
    g1.append("g")
        .call(d3.axisLeft(y1));
    
    // X label
    g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 50)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Attack");
    
    // Y label
    g1.append("text")
        .attr("x", -scatterHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("font-size", "14px")
        .text("Special Attack");
    
    // Add circles for each Pokemon
    g1.selectAll(".pokemon-circle")
        .data(rawData)
        .enter()
        .append("circle")
        .attr("class", "pokemon-circle")
        .attr("cx", d => x1(d.Attack))
        .attr("cy", d => y1(d.Sp_Atk))
        .attr("r", 4)
        .attr("fill", d => typeColors[d.Type_1])
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.7)
        .on("mouseover", function(d) {
            // Highlight circle on hover
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 6)
                .attr("opacity", 1)
                .attr("stroke-width", 1.5);
            
            // Show tooltip
            tooltip
                .style("opacity", 0.9)
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 10) + "px")
                .html(`
                    <strong>${d.Name} #${d.Number}</strong><br>
                    <span style="color:${typeColors[d.Type_1]}">●</span> ${d.Type_1}${d.Type_2 ? ' / ' + d.Type_2 : ''}<br>
                    Attack: ${d.Attack}<br>
                    Sp. Attack: ${d.Sp_Atk}<br>
                    HP: ${d.HP}<br>
                    Defense: ${d.Defense}<br>
                    Sp. Defense: ${d.Sp_Def}<br>
                    Speed: ${d.Speed}<br>
                    Total: ${d.Total}
                `);
        })
        .on("mouseout", function() {
            // Restore circle appearance
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 4)
                .attr("opacity", 0.7)
                .attr("stroke-width", 0.5);
            
            // Hide tooltip
            tooltip
                .style("opacity", 0);
        });
    
    // Add legend for types
    // Get unique types first
    const types = Array.from(new Set(rawData.map(d => d.Type_1)));
    
    // Create a new group for the legend positioned on the far left
    const legend = svg.append("g")
        .attr("transform", `translate(40, ${scatterTop + scatterMargin.top + scatterHeight + 70})`);

    // Add "Pokemon Types" text above the legend
    legend.append("text")
        .attr("x", 170)  
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .text("Pokemon Types");
    
    // Calculate number of columns to display
    const columnsCount = 3;
    const legendItemsPerColumn = Math.ceil(types.length / columnsCount);
    
    // Add legend items in multiple columns
    types.forEach((type, i) => {
        const column = Math.floor(i / legendItemsPerColumn);
        const row = i % legendItemsPerColumn;
        
        legend.append("circle")
            .attr("cx", column * 150 + 10)
            .attr("cy", row * 20 + 0)
            .attr("r", 5)
            .attr("fill", typeColors[type]);
        
        legend.append("text")
            .attr("x", column * 150 + 20)
            .attr("y", row * 20 + 4)
            .attr("font-size", "12px")
            .text(type);
    });

     //-------------------------------------------------------------------
    // VISUALIZATION 3: Parallel Coordinates Plot (Advanced Visualization)
    //-------------------------------------------------------------------
    
    // Create a new group for the parallel coordinates plot
    // Position it below both existing visualizations
    const parallelMargin = {top: 140, right: 70, bottom: -30, left: 70};
    const parallelWidth = width - parallelMargin.left - parallelMargin.right;
    const parallelHeight = height/2.5 - parallelMargin.top - parallelMargin.bottom;
    
    const g3 = svg.append("g")
        .attr("transform", `translate(${parallelMargin.left}, ${height/2 + parallelMargin.top})`);
    
    // Add title
    g3.append("text")
        .attr("x", parallelWidth / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Pokemon Stats by Type (Parallel Coordinates)");
    
    // Dimensions for parallel coordinates (stats)
    const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
    const dimensionLabels = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"];
    
    // Create scales for each dimension
    const y3 = {};
    dimensions.forEach((dimension, i) => {
        y3[dimension] = d3.scaleLinear()
            .domain([0, d3.max(rawData, d => d[dimension])])
            .range([parallelHeight, 0]);
    });
    
    // Build the X scale
    const x3 = d3.scalePoint()
        .range([0, parallelWidth])
        .domain(dimensions);
    
    // Create axis for each dimension
    dimensions.forEach((dimension, i) => {
        g3.append("g")
            .attr("transform", `translate(${x3(dimension)}, 0)`)
            .call(d3.axisLeft(y3[dimension]))
            .call(g => g.append("text")
                .attr("x", 0)
                .attr("y", -10)
                .attr("text-anchor", "middle")
                .attr("fill", "#000")
                .attr("font-size", "12px")
                .text(dimensionLabels[i]));
    });
    
    // Create hover effect for highlighting
    let highlightedType = null;
    
    // Add vertical tick line guides
    dimensions.forEach(dimension => {
        g3.append("g")
            .attr("transform", `translate(${x3(dimension)}, 0)`)
            .append("line")
            .attr("y1", 0)
            .attr("y2", parallelHeight)
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1);
    });
    
    // Function to convert a d row to coordinates
    const line = d3.line()
        .defined(d => !isNaN(d[1]))
        .x(d => x3(d[0]))
        .y(d => y3[d[0]](d[1]));
    
    // Add lines for each Pokemon
    const parallelLines = g3.selectAll(".pokemon-line")
        .data(rawData)
        .enter()
        .append("path")
        .attr("class", "pokemon-line")
        .attr("d", d => {
            return line(dimensions.map(dimension => [dimension, +d[dimension]]));
        })
        .attr("fill", "none")
        .attr("stroke", d => typeColors[d.Type_1])
        .attr("stroke-width", 1.2)
        .attr("opacity", 0.5)
        .on("mouseover", function(d) {
            // Highlight this line
            d3.select(this)
                .attr("stroke-width", 3)
                .attr("opacity", 1);
            
            // Show tooltip
            tooltip
                .style("opacity", 0.9)
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 28) + "px")
                .html(`
                    <strong>${d.Name}</strong><br>
                    Type: ${d.Type_1}${d.Type_2 ? "/" + d.Type_2 : ""}<br>
                    HP: ${d.HP}<br>
                    Attack: ${d.Attack}<br>
                    Defense: ${d.Defense}<br>
                    Sp. Atk: ${d.Sp_Atk}<br>
                    Sp. Def: ${d.Sp_Def}<br>
                    Speed: ${d.Speed}<br>
                `);
                
            // Set highlighted type
            highlightedType = d.Type_1;
            
            // Dim all other lines for Pokemon of different types
            parallelLines
                .filter(p => p.Type_1 !== highlightedType)
                .attr("opacity", 0.1);
        })
        .on("mouseout", function() {
            // Restore this line
            d3.select(this)
                .attr("stroke-width", 1.2)
                .attr("opacity", 0.5);
            
            // Hide tooltip
            tooltip
                .style("opacity", 0);
                
            // Restore all lines
            if (highlightedType) {
                parallelLines.attr("opacity", 0.5);
                highlightedType = null;
            }
        });
        
    // Add a legend for the parallel coordinates
    const parallelLegendX = parallelWidth - 250;
    const parallelLegendY = -110;
    
    // Create two columns of types for the legend
    const typesForLegend = Object.keys(typeColors);
    const typesPerColumn = Math.ceil(typesForLegend.length / 3);
    
    typesForLegend.forEach((type, i) => {
        const column = Math.floor(i / typesPerColumn);
        const row = i % typesPerColumn;
        
        // Add colored line
        g3.append("line")
            .attr("x1", parallelLegendX + column * 80)
            .attr("y1", parallelLegendY + row * 15)
            .attr("x2", parallelLegendX + column * 80 + 20)
            .attr("y2", parallelLegendY + row * 15)
            .attr("stroke", typeColors[type])
            .attr("stroke-width", 2);
            
        // Add type name
        g3.append("text")
            .attr("x", parallelLegendX + column * 80 + 25)
            .attr("y", parallelLegendY + row * 15 + 4)
            .attr("font-size", "10px")
            .text(type);
    });
    
    // Add buttons to highlight all Pokemon of a type
    const buttonY = parallelHeight + 20;
    
    // "Show All" button
    g3.append("rect")
        .attr("x", 0)
        .attr("y", buttonY)
        .attr("width", 70)
        .attr("height", 20)
        .attr("fill", "#ddd")
        .attr("rx", 5)
        .attr("cursor", "pointer")
        .on("click", function() {
            // Reset all lines to default opacity
            parallelLines.attr("opacity", 0.5);
        });
        
    g3.append("text")
        .attr("x", 35)
        .attr("y", buttonY + 14)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text("Show All")
        .attr("pointer-events", "none");
    
    // Add buttons for some common types
    const commonTypes = ["Fire", "Water", "Grass", "Electric", "Psychic", "Dragon"];
    
    commonTypes.forEach((type, i) => {
        const buttonX = 80 + i * 80;
        
        g3.append("rect")
            .attr("x", buttonX)
            .attr("y", buttonY)
            .attr("width", 70)
            .attr("height", 20)
            .attr("fill", typeColors[type])
            .attr("rx", 5)
            .attr("opacity", 0.8)
            .attr("cursor", "pointer")
            .on("click", function() {
                // Highlight only Pokemon of this type
                parallelLines
                    .attr("opacity", d => d.Type_1 === type ? 0.9 : 0.1)
                    .attr("stroke-width", d => d.Type_1 === type ? 2 : 1);
            });
            
        g3.append("text")
            .attr("x", buttonX + 35)
            .attr("y", buttonY + 14)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#fff")
            .text(type)
            .attr("pointer-events", "none");
    });

    // Log error for debugging
}).catch(function(error) {
    console.log("Error loading data:", error);
    
    // Display error message
    const svg = d3.select("svg");
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "red")
        .attr("font-size", "18px")
        .text("Error loading data. Check the console for details.");
});