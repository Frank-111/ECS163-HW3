// load data
Promise.all([ d3.csv("student-mat.csv"), ]).then(data => {
  console.log("CSV Data Loaded:", data); // log loaded data
  const df = data[0];

  // --- data type conv ---
  // conv columns to number
  df.forEach(d => {
      d.G1 = +d.G1;
      d.G2 = +d.G2;
      d.G3 = +d.G3;
      d.studytime = +d.studytime;   // 1 - <2 hours, 2 - 2 to 5 hours, 3 - 5 to 10 hours, 4 - >10 hours
      d.failures = +d.failures;     // n if 1<=n<3, else 4
      d.absences = +d.absences;     // from 0 to 93
      d.traveltime = +d.traveltime; // 1 - <15 min., 2 - 15 to 30 min., 3 - 30 min. to 1 hour, or 4 - >1 hour
      d.freetime = +d.freetime;     // from 1 (very low) to 5 (very high)
      d.goout = +d.goout;           // from 1 (very low) to 5 (very high)
      d.health = +d.health;         // from 1 (very bad) to 5 (very good)
  });
  console.log("Data types converted.");

  // tooltip
  const tooltip = d3.select(".tooltip");
  if (tooltip.empty()) {
      console.warn("Tooltip element not found.");
  }


  // --- CORD DIAGRAM ---
  function createChordDiagram(data) {
      console.log("Attempting to create Chord Diagram...");
      try { 
          const container = d3.select("#chord .chart-svg-container");
          container.select("svg").remove(); 

          if (container.empty()) {
              console.error("Chord Diagram container (.chart-svg-container) not found.");
              return;
          }
          const containerNode = container.node();
          
          const width = containerNode.clientWidth;
          const height = containerNode.clientHeight;
          console.log("Chord container dimensions:", width, height);

          
          const outerRadius = Math.min(width, height) * 0.5 - 40; 
          const innerRadius = outerRadius - 10;

          const jobCategories = ["teacher", "health", "services", "at_home", "other"];
          const matrix = Array(jobCategories.length).fill(0).map(() => Array(jobCategories.length).fill(0));

          data.forEach(d => {
              const mjobIndex = jobCategories.indexOf(d.Mjob);
              const fjobIndex = jobCategories.indexOf(d.Fjob);
              if (mjobIndex !== -1 && fjobIndex !== -1) {
                  matrix[mjobIndex][fjobIndex]++;
              }
          });

          const svg = container.append("svg")
              .attr("width", width)
              .attr("height", height)
              .append("g")
              .attr("transform", `translate(${width / 2}, ${height / 2})`);

          const chord = d3.chord()
              .padAngle(0.05)
              .sortSubgroups(d3.descending);

          const chords = chord(matrix);

          // define color scale
          const color = d3.scaleOrdinal(d3.schemeCategory10) // std color scheme
              .domain(jobCategories);

          // groups arcs
          const group = svg.append("g")
              .selectAll("g")
              .data(chords.groups)
              .join("g");

          group.append("path")
              .attr("fill", d => color(jobCategories[d.index]))
              .attr("stroke", d => d3.rgb(color(jobCategories[d.index])).darker())
              .attr("d", d3.arc().innerRadius(innerRadius).outerRadius(outerRadius))
              .on("mouseover", function(d) {
                 tooltip.style("visibility", "visible")
                        .html(`Job: <b>${jobCategories[d.index]}</b><br>Count: ${d.value}`);
                 d3.select(this).attr("fill-opacity", 1);
               })
              .on("mousemove", function() {
                 tooltip.style("top", (d3.event.pageY - 10) + "px")
                        .style("left", (d3.event.pageX + 10) + "px");
               })
              .on("mouseout", function() {
                  tooltip.style("visibility", "hidden");
                  d3.select(this).attr("fill-opacity", null);
              });

          // labels to groups
           group.append("text")
              .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
              .attr("dy", ".35em")
              .attr("transform", d => `
                  rotate(${(d.angle * 180 / Math.PI - 90)})
                  translate(${outerRadius + 5})
                  ${d.angle > Math.PI ? "rotate(180)" : ""}
              `)
              .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
              .text(d => jobCategories[d.index])
              .style("font-size", "10px") // force font size to what I want
              .style("fill", "#333");


          // ribbon cords
          svg.append("g")
              .attr("fill-opacity", 0.75) // CSS opacity
              .selectAll("path")
              .data(chords)
              .join("path")
              .attr("d", d3.ribbon().radius(innerRadius))
              .attr("fill", d => color(jobCategories[d.target.index]))
              .attr("stroke", d => d3.rgb(color(jobCategories[d.target.index])).darker())
               .on("mouseover", function(d) {
                 tooltip.style("visibility", "visible")
                        .html(`Connection: <b>${jobCategories[d.source.index]}</b> (Mother)
                               to <b>${jobCategories[d.target.index]}</b> (Father)<br>
                               Count: ${d.source.value}`);
                 d3.select(this).attr("fill-opacity", 1);
               })
               .on("mousemove", function() {
                 tooltip.style("top", (d3.event.pageY - 10) + "px")
                        .style("left", (d3.event.pageX + 10) + "px");
               })
              .on("mouseout", function() {
                  tooltip.style("visibility", "hidden");
                   d3.select(this).attr("fill-opacity", null); // CSS opacity
              });

          console.log("Chord Diagram created successfully.");
      } catch (error) {}
  }

  // ---- STAR PLOT ----
  function createStarPlot(data) {
      console.log("Attempting to create Star Plot...");
       try {
          const container = d3.select("#starplot .chart-svg-container");
          container.select("svg").remove();

          if (container.empty()) {
              console.error("Star Plot container (.chart-svg-container) not found.");
              return;
          }
           const containerNode = container.node();
          if (!containerNode) {
             console.error("Star Plot container node is null.");
             return;
          }
          const width = containerNode.clientWidth;
          const height = containerNode.clientHeight;
          console.log("Star Plot container dimensions:", width, height);

           if (width <= 0 || height <= 0) {
             console.warn("Star Plot container has zero or invalid dimensions. Skipping render.");
             return;
           }

          const margin = { top: 40, right: 40, bottom: 40, left: 40 }; // larger margins for labels
          const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;

           // --- calcualtion for average student ---
          const attributes = ['G1', 'G2', 'G3', 'studytime', 'failures', 'absences', 'traveltime', 'freetime', 'goout', 'health'];
          const averageData = {};
          const maxValues = { 
              G1: 20, G2: 20, G3: 20,
              studytime: 4, failures: 4, absences: 30, 
              traveltime: 4, freetime: 5, goout: 5, health: 5
          };

          attributes.forEach(attr => {
              averageData[attr] = d3.mean(data, d => d[attr]);
              if (averageData[attr] > maxValues[attr]) {
                  averageData[attr] = maxValues[attr];
              }
          });
           console.log("Average Data for Star Plot:", averageData);

           const angleSlice = Math.PI * 2 / attributes.length;

          // ---- SCALE ----
          const rScales = {};
          attributes.forEach(attr => {
              // scale maps [0, max] to [0, radius]
              rScales[attr] = d3.scaleLinear()
                  .range([0, radius])
                  .domain([0, maxValues[attr]]);
          });

          // ---- SVG ----
          const svg = container.append("svg")
              .attr("width", width)
              .attr("height", height)
              .append("g")
              .attr("transform", `translate(${width / 2}, ${height / 2})`);

           // ---- AXES DRAWN ----
           const axisGrid = svg.append("g").attr("class", "axisWrapper");

           // concentric circles (scale markers)
           const levels = 5;
           axisGrid.selectAll(".levels")
              .data(d3.range(1, levels + 1).reverse())
              .enter()
              .append("circle")
              .attr("class", "gridCircle")
              .attr("r", d => radius / levels * d)
              .style("fill", "#CDCDCD")
              .style("stroke", "#CDCDCD")
              .style("fill-opacity", 0.1);

            // text to show at what % each level is
            axisGrid.selectAll(".axisLabel")
               .data(d3.range(1, levels + 1).reverse())
               .enter().append("text")
               .attr("class", "scale-legend")
               .attr("x", 4)
               .attr("y", d => -d * radius / levels)
               .attr("dy", "0.4em")
               .style("font-size", "10px")
               .attr("fill", "#737373")
               .text(d => `${((maxValues.G1 / levels) * d).toFixed(0)}`); // e.g., using G1 max for scale labels


           // straight lines out of center
           const axis = axisGrid.selectAll(".axis")
               .data(attributes)
               .enter()
               .append("g")
               .attr("class", "axis");

           // add lines
           axis.append("line")
               .attr("x1", 0)
               .attr("y1", 0)
               .attr("x2", (d, i) => rScales[d](maxValues[d]) * Math.cos(angleSlice * i - Math.PI / 2))
               .attr("y2", (d, i) => rScales[d](maxValues[d]) * Math.sin(angleSlice * i - Math.PI / 2))
               .attr("class", "line")
               .style("stroke", "grey")
               .style("stroke-width", "1px");

           // add labels to axes
            axis.append("text")
                .attr("class", "axis-label")
                .style("font-size", "10px") 
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .attr("x", (d, i) => (rScales[d](maxValues[d]) * 1.1) * Math.cos(angleSlice * i - Math.PI / 2)) 
                .attr("y", (d, i) => (rScales[d](maxValues[d]) * 1.1) * Math.sin(angleSlice * i - Math.PI / 2))
                .text(d => d)
                 .call(wrap, 60); // wrap labels if too long


           // --- STAR POLYGON ----
           const radarLine = d3.lineRadial()
               .curve(d3.curveLinearClosed)
               .radius(d => rScales[d.attribute](d.value))
               .angle((d, i) => i * angleSlice);

           const plotData = attributes.map(attr => ({
               attribute: attr,
               value: averageData[attr]
           }));

           const blobWrapper = svg.selectAll(".radarWrapper")
               .data([plotData])
               .enter().append("g")
               .attr("class", "radarWrapper");

           // add in backgrounds
           blobWrapper
               .append("path")
               .attr("class", "star-polygon")
               .attr("d", radarLine)
               .style("fill", "steelblue")
               .style("fill-opacity", 0.5)
                .on("mouseover", function(d) {
                    tooltip.style("visibility", "visible")
                           .html("Average Student Profile<br>" +
                                attributes.map(attr => `${attr}: ${averageData[attr].toFixed(2)}`).join("<br>"));
                     d3.select(this).style("fill-opacity", 0.7);
                })
               .on("mousemove", function() {
                    tooltip.style("top", (d3.event.pageY - 10) + "px")
                           .style("left", (d3.event.pageX + 10) + "px");
                })
               .on("mouseout", function() {
                    tooltip.style("visibility", "hidden");
                    d3.select(this).style("fill-opacity", 0.5);
                });

            console.log("Star Plot created successfully.");

       } catch(error) {
           console.error("Error creating Star Plot:", error);
       }
  }

    function wrap(text, width) {
      text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\\s+/).reverse(), // split w spaces
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em"); // Use existing x,y,dy

        // "is splitting needed?"
         if (words.length <= 1 && text.node().getComputedTextLength() < width) {
            tspan.text(words[0] || text.text());
            return;
         }

         text.attr("dy", "0em");
         tspan.attr("dy", dy + "em");


        while (word = words.pop()) {
          line.push(word);
          tspan.text(line.join(" "));
          if (tspan.node().getComputedTextLength() > width) {
             if (line.length > 1) { // pop words only if more than one word
                line.pop(); 
                tspan.text(line.join(" "));
                line = [word]; 
                tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
             } else { // Only one word was added
                line = [];
                tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(""); // Start empty tspan for next word
             }

          }
        }
      });
    }


  // --- Scatter Plot ---
   function createScatterplot(data) {
       console.log("Attempting to create Scatterplot...");
       try {
          const container = d3.select("#scatterplot .chart-svg-container");
          container.select("svg").remove(); // get rid of old SVG

           if (container.empty()) {
              console.error("Scatterplot container (.chart-svg-container) not found.");
              return;
          }
           const containerNode = container.node();
          if (!containerNode) {
             console.error("Scatterplot container node is null.");
             return;
          }
          const width = containerNode.clientWidth;
          const height = containerNode.clientHeight;
           console.log("Scatterplot container dimensions:", width, height);

          if (width <= 0 || height <= 0) {
             console.warn("Scatterplot container has zero or invalid dimensions. Skipping render.");
             return;
           }

          const margin = { top: 20, right: 30, bottom: 40, left: 40 };
          const innerWidth = width - margin.left - margin.right;
          const innerHeight = height - margin.top - margin.bottom;

          const svg = container.append("svg")
              .attr("width", width)
              .attr("height", height)
              .append("g")
              .attr("transform", `translate(${margin.left}, ${margin.top})`);

          // scales
          const xScale = d3.scaleLinear()
              .domain([0, d3.max(data, d => d.G1)])
              .range([0, innerWidth])
              .nice();

          const yScale = d3.scaleLinear()
              .domain([0, d3.max(data, d => d.G3)])
              .range([innerHeight, 0])
              .nice();

           // colorbased on 'higher' (higher education)
           const colorScale = d3.scaleOrdinal()
              .domain(["yes", "no"])
              .range(["steelblue", "darkorange"]); // Blue = YES, Orange = NO


          // axes
          const xAxis = d3.axisBottom(xScale);
          const yAxis = d3.axisLeft(yScale);

          svg.append("g")
              .attr("class", "x axis")
              .attr("transform", `translate(0, ${innerHeight})`)
              .call(xAxis);

          svg.append("g")
              .attr("class", "y axis")
              .call(yAxis);

           // axis labels
           svg.append("text")
              .attr("class", "axis-label")
              .attr("text-anchor", "end")
              .attr("x", innerWidth / 2 + margin.left)
              .attr("y", innerHeight + margin.bottom - 5)
               .style("font-size", "12px")
              .text("First Period Grade (G1)");

            svg.append("text")
               .attr("class", "axis-label")
               .attr("text-anchor", "end")
               .attr("transform", "rotate(-90)")
               .attr("y", -margin.left + 15) 
               .attr("x", -innerHeight / 2)
               .style("font-size", "12px")
               .text("Final Grade (G3)");


          // draw circles
          svg.selectAll("circle")
              .data(data)
              .enter()
              .append("circle")
              .attr("cx", d => xScale(d.G1))
              .attr("cy", d => yScale(d.G3))
              .attr("r", 4)
              .attr("fill", d => colorScale(d.higher)) // color based on 'higher'
              .attr("opacity", 0.7)
              .attr("stroke", "#333") // little small border
              .attr("stroke-width", 0.5)
                .on("mouseover", function(d) {
                    tooltip.style("visibility", "visible")
                           .html(`G1: ${d.G1}<br>G3: ${d.G3}<br>Higher Edu: ${d.higher}<br>Study Time: ${d.studytime} <br>Absences: ${d.absences}`);
                    d3.select(this).attr("fill", "red").attr("opacity", 1); // highlight on hover!!
                })
                .on("mousemove", function() {
                    tooltip.style("top", (d3.event.pageY - 10) + "px")
                           .style("left", (d3.event.pageX + 10) + "px");
                })
                .on("mouseout", function(d) {
                    tooltip.style("visibility", "hidden");
                    d3.select(this).attr("fill", colorScale(d.higher)).attr("opacity", 0.7); // return to original color after done
                });

              console.log("Scatterplot created successfully.");

        } catch (error) {
               console.error("Error creating Scatterplot:", error);
        }
        
  }


  // original chart creation
  createChordDiagram(df);
  createStarPlot(df);
  createScatterplot(df);


  // make sure we don't resize too much
  function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
          const later = () => {
              clearTimeout(timeout);
              func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
      };
  }

 // listening for resize w debouncing (?)
 const handleResize = debounce(() => {
      createChordDiagram(df);
      createStarPlot(df);
      createScatterplot(df);
  }, 250); // lil delay delay

 window.addEventListener('resize', handleResize);
});