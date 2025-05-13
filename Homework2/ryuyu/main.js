// analyze music effects

const width = 800;
const height = 400;

const margin = { top: 20, right: 30, bottom: 40, left: 40 };

const barChartWidth = width - margin.left - margin.right;
const barChartHeight = height - margin.top - margin.bottom;

const scatterPlotWidth = width - margin.left - margin.right;
const scatterPlotHeight = height - margin.top - margin.bottom;

const dendrogramWidth = width - margin.left - margin.right;
const dendrogramHeight = height - margin.top - margin.bottom;

d3.csv('./data/mxmh_survey_results.csv').then((data) => {
  console.log('data', data);

  // filter out data where there are no music effects listed
  const filteredData = data.filter(
    (d) => d['Music effects'] !== '' && d['Hours per day'] !== ''
  );
  console.log('filteredData', filteredData);

  // bar chart - Music Effects vs Average Hours Per Day
  const svg = d3.select('svg');
  const effectTotals = {};
  filteredData.forEach((d) => {
    const effect = d['Music effects'];
    const hours = parseFloat(d['Hours per day']);
    if (!effectTotals[effect]) {
      effectTotals[effect] = { total: 0, count: 0 };
    }
    effectTotals[effect].total += hours;
    effectTotals[effect].count += 1;
  });

  const effectAverages = Object.keys(effectTotals).map((effect) => {
    return {
      effect: effect,
      average: effectTotals[effect].total / effectTotals[effect].count,
    };
  });
  console.log('effectAverages', effectAverages);

  // Sort the data by average hours per day
  effectAverages.sort((a, b) => b.average - a.average);
  console.log('sorted effectAverages', effectAverages);

  // Create scales
  const xScale = d3
    .scaleBand()
    .domain(effectAverages.map((d) => d.effect))
    .range([0, barChartWidth])
    .padding(0.1);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(effectAverages, (d) => d.average)])
    .range([barChartHeight, 0]);

  // Create axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).ticks(10);

  // Create the bar chart
  const bar = svg
    .append('g')
    .attr('transform', `translate(${margin.left + 40}, ${margin.top})`);

  // add the x and y axes to the bar chart
  bar
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${barChartHeight})`)
    .call(xAxis);

  bar
    .append('g')
    .attr('class', 'y-axis')
    .call(yAxis)
    .append('text')
    .attr('y', -10)
    .attr('x', -20)
    .attr('dy', '0.71em')
    .style('text-anchor', 'end')
    .text('Average Hours Per Day');

  // add the bars to the bar chart
  bar
    .selectAll('rect')
    .data(effectAverages)
    .enter()
    .append('rect')
    .attr('x', (d) => xScale(d.effect))
    .attr('y', (d) => yScale(d.average))
    .attr('width', xScale.bandwidth())
    .attr('height', (d) => barChartHeight - yScale(d.average))
    .attr('fill', 'steelblue');

  // add label to x and y axes
  bar
    .append('text')
    .attr('x', barChartWidth / 2)
    .attr('y', barChartHeight + 50)
    .attr('font-size', '20px')
    .attr('text-anchor', 'middle')
    .text('Music Effects');

  bar
    .append('text')
    .attr('x', -(barChartHeight / 2))
    .attr('y', -40)
    .attr('font-size', '20px')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .text('Average Hours Per Day');

  // scatter plot - One scatter plot for each music effect; Each scatter plot plots the age of the person vs. hours per day
  const numPlots = 3;
  const effectsToShow = effectAverages.slice(0, numPlots); // top 3 effects by average

  const scatterWidth = barChartWidth / numPlots;
  const scatterHeight = 300; // height for each scatter plot
  const scatterTop = margin.top + 40; // top position for scatter plot
  const scatterLeft = barChartWidth + margin.left + 140; // left position for scatter plot
  const scatterSpacing = 100; // space between plots

  const scatterPlot = svg
    .append('g')
    .attr('transform', `translate(${scatterLeft}, ${scatterTop})`);

  // create a group for each effect
  const scatterPlotGroup = scatterPlot
    .selectAll('g')
    .data(effectsToShow)
    .enter()
    .append('g')
    .attr('height', scatterHeight)
    .attr(
      'transform',
      (d, i) => `translate(${i * (scatterWidth + scatterSpacing)}, 0)`
    );

  // add the label to each scatter plot
  scatterPlotGroup
    .append('text')
    .attr('x', scatterWidth / 2)
    .attr('y', -20)
    .attr('font-size', '14px')
    .attr('text-anchor', 'middle')
    .text((d) => d.effect);

  // add the x and y axes to each scatter plot
  scatterPlotGroup
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${scatterHeight})`)
    .each(function () {
      d3.select(this).call(
        d3
          .axisBottom(
            d3.scaleLinear().domain([0, 100]).range([0, scatterWidth])
          )
          .ticks(4)
      );
    });

  scatterPlotGroup
    .append('g')
    .attr('class', 'y-axis')
    .each(function () {
      d3.select(this).call(
        d3
          .axisLeft(d3.scaleLinear().domain([0, 24]).range([scatterHeight, 0]))
          .ticks(5)
      );
    });

  // add the data points to each scatter plot
  scatterPlotGroup
    .selectAll('circle')
    .data((d) => filteredData.filter((f) => f['Music effects'] === d.effect))
    .enter()
    .append('circle')
    .attr('cx', (d) =>
      d3.scaleLinear().domain([0, 100]).range([0, scatterWidth])(d['Age'])
    )
    .attr('cy', (d) =>
      d3.scaleLinear().domain([0, 24]).range([scatterHeight, 0])(
        d['Hours per day']
      )
    )
    .attr('r', 3)
    .attr('fill', 'steelblue');

  // add label to axes
  scatterPlotGroup
    .append('text')
    .attr('x', scatterWidth / 2)
    .attr('y', scatterHeight + 30)
    .attr('font-size', '14px')
    .attr('text-anchor', 'middle')
    .text('Age');

  scatterPlotGroup
    .append('text')
    .attr('x', -(scatterHeight / 2))
    .attr('y', -40)
    .attr('font-size', '14px')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .text('Hours Per Day');

  // sankey diagram - binned age groups to binned hours per day to music effects
  // Bin ages
  function binAge(age) {
    age = +age;
    if (age < 18) return '<18';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 50) return '35-49';
    return '50+';
  }

  // Bin hours per day
  function binHours(hours) {
    hours = +hours;
    if (hours < 1) return '<1';
    if (hours < 3) return '1-2';
    if (hours < 6) return '3-5';
    return '6+';
  }

  // Define sorted order for bins
  const ageBinOrder = ['<18', '18-24', '25-34', '35-49', '50+'];
  const hoursBinOrder = ['<1', '1-2', '3-5', '6+'];

  // Prepare sankey data
  const sankeyData = { nodes: [], links: [] };
  let ageBinsSet = new Set();
  let hoursBinsSet = new Set();
  let effectsSet = new Set();

  // Collect unique bins and effects
  filteredData.forEach((d) => {
    const ageBin = binAge(d['Age']);
    const hoursBin = binHours(d['Hours per day']);
    const effect = d['Music effects'];
    ageBinsSet.add(ageBin);
    hoursBinsSet.add(hoursBin);
    effectsSet.add(effect);
  });

  // Sort bins and effects so that <18 and <1 are before others
  const ageBins = ageBinOrder.filter((bin) => ageBinsSet.has(bin));
  const hoursBins = hoursBinOrder.filter((bin) => hoursBinsSet.has(bin));
  const effects = Array.from(effectsSet).sort(d3.ascending);

  // Build nodeNames in sorted order: age bins, hours bins, effects
  const nodeNames = [...ageBins, ...hoursBins, ...effects];
  const nodeIndex = {};
  nodeNames.forEach((name, i) => {
    nodeIndex[name] = i;
  });

  sankeyData.nodes = nodeNames.map((name) => ({ name }));

  // Count flows: ageBin -> hoursBin, hoursBin -> effect
  const linkMap = {};

  filteredData.forEach((d) => {
    const ageBin = binAge(d['Age']);
    const hoursBin = binHours(d['Hours per day']);
    const effect = d['Music effects'];

    // ageBin -> hoursBin
    const key1 = `${ageBin}|${hoursBin}`;
    if (!linkMap[key1])
      linkMap[key1] = {
        source: nodeIndex[ageBin],
        target: nodeIndex[hoursBin],
        value: 0,
        type: 'age-hours',
        group: ageBin,
      };
    linkMap[key1].value += 1;

    // hoursBin -> effect
    const key2 = `${hoursBin}|${effect}`;
    if (!linkMap[key2])
      linkMap[key2] = {
        source: nodeIndex[hoursBin],
        target: nodeIndex[effect],
        value: 0,
        type: 'hours-effect',
        group: effect,
      };
    linkMap[key2].value += 1;
  });

  sankeyData.links = Object.values(linkMap);

  // Color scales for links
  const ageColor = d3
    .scaleOrdinal()
    .domain(ageBins)
    .range(d3.schemeSet2.slice(0, ageBins.length));

  const effectColor = d3
    .scaleOrdinal()
    .domain(effects)
    .range(d3.schemeSet3.slice(0, effects.length));

  // Assign color to each link
  sankeyData.links.forEach((link) => {
    if (link.type === 'age-hours') {
      link.color = ageColor(link.group);
    } else {
      link.color = effectColor(link.group);
    }
  });

  // Draw sankey diagram
  const sankeyWidth = 600;
  const sankeyHeight = 400;
  const sankeyLeft = margin.left;
  const sankeyTop = height + 100;

  const sankeyGroup = svg
    .append('g')
    .attr('id', 'sankey-group')
    .attr('transform', `translate(${sankeyLeft}, ${sankeyTop})`);

  // Use d3-sankey
  const sankey = d3
    .sankey()
    .nodeWidth(20)
    .nodePadding(20)
    .extent([
      [0, 0],
      [sankeyWidth, sankeyHeight],
    ]);

  const sankeyGraph = sankey({
    nodes: sankeyData.nodes.map((d) => Object.assign({}, d)),
    links: sankeyData.links.map((d) => Object.assign({}, d)),
  });

  // Draw links
  sankeyGroup
    .append('g')
    .selectAll('path')
    .data(sankeyGraph.links)
    .enter()
    .append('path')
    .attr('d', d3.sankeyLinkHorizontal())
    .attr('stroke', (d) => d.color)
    .attr('stroke-width', (d) => Math.max(1, d.width))
    .attr('fill', 'none')
    .attr('opacity', 0.5);

  // Draw nodes
  sankeyGroup
    .append('g')
    .selectAll('rect')
    .data(sankeyGraph.nodes)
    .enter()
    .append('rect')
    .attr('x', (d) => d.x0)
    .attr('y', (d) => d.y0)
    .attr('width', (d) => d.x1 - d.x0)
    .attr('height', (d) => Math.max(1, d.y1 - d.y0))
    .attr('fill', '#4682b4')
    .attr('stroke', '#333');

  // Node labels
  sankeyGroup
    .append('g')
    .selectAll('text')
    .data(sankeyGraph.nodes)
    .enter()
    .append('text')
    .attr('x', (d) => d.x0 - 6)
    .attr('y', (d) => (d.y0 + d.y1) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .text((d) => d.name)
    .filter((d) => d.x0 < sankeyWidth / 2)
    .attr('x', (d) => d.x1 + 6)
    .attr('text-anchor', 'start');

  // Sankey title
  sankeyGroup
    .append('text')
    .attr('x', sankeyWidth / 2)
    .attr('y', -20)
    .attr('font-size', '18px')
    .attr('text-anchor', 'middle')
    .text('Sankey: Age Group → Hours/Day → Music Effect');

  // Legend for link colors
  const legendGroup = svg
    .append('g')
    .attr('id', 'sankey-legend')
    .attr(
      'transform',
      `translate(${sankeyLeft + sankeyWidth + 40}, ${sankeyTop})`
    );

  // Age group legend
  legendGroup
    .append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('font-size', '14px')
    .attr('font-weight', 'bold')
    .text('Age Group → Hours/Day');

  ageBins.forEach((bin, i) => {
    legendGroup
      .append('rect')
      .attr('x', 0)
      .attr('y', 20 + i * 22)
      .attr('width', 18)
      .attr('height', 18)
      .attr('fill', ageColor(bin));
    legendGroup
      .append('text')
      .attr('x', 26)
      .attr('y', 34 + i * 22)
      .attr('font-size', '13px')
      .text(bin);
  });

  // Effect legend
  const effectLegendY = 60 + ageBins.length * 22;
  legendGroup
    .append('text')
    .attr('x', 0)
    .attr('y', effectLegendY)
    .attr('font-size', '14px')
    .attr('font-weight', 'bold')
    .text('Hours/Day → Music Effect');

  effects.forEach((effect, i) => {
    legendGroup
      .append('rect')
      .attr('x', 0)
      .attr('y', effectLegendY + 10 + i * 22)
      .attr('width', 18)
      .attr('height', 18)
      .attr('fill', effectColor(effect));
    legendGroup
      .append('text')
      .attr('x', 26)
      .attr('y', effectLegendY + 24 + i * 22)
      .attr('font-size', '13px')
      .text(effect);
  });
});
