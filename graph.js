function handleFileSelect(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            console.log('Workbook read successfully:', workbook.SheetNames);

            const flattened_df = flattenWorkbook(workbook);
            console.log('Flattened data:', flattened_df.slice(0, 5)); // Log first 5 rows

            const openprojectUrl = document.getElementById('openprojectUrl').value;
            localStorage.setItem('openprojectUrl', openprojectUrl);
            console.log('OpenProject URL saved');

            const elements = processData(flattened_df, openprojectUrl);
            console.log('Processed elements:', elements.slice(0, 10)); // Log first 10 elements

            // Save elements to localStorage
            localStorage.setItem('graphData', JSON.stringify(elements));
            console.log('Graph data saved to localStorage');

            renderGraph(elements);
        } catch (error) {
            console.error('Error in handleFileSelect:', error);
        }
    };

    reader.onerror = function (error) {
        console.error('Error reading file:', error);
    };

    reader.readAsArrayBuffer(file);
}

function flattenWorkbook(workbook) {
    try {
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log('Original data:', data.slice(0, 5)); // Log first 5 rows

        const header1 = data[0];
        const header2 = data[1];
        const combinedHeader = [];
        let currentGroup = '';

        for (let i = 0; i < Math.max(header1.length, header2.length); i++) {
            const h1 = header1[i] || '';
            const h2 = header2[i] || '';
            if (h1 !== '') {
                currentGroup = h1.trim();
            }

            // Always include the column, even if header2 is empty
            const headerName = h2 ? `${currentGroup}.${h2.trim()}` : currentGroup;
            combinedHeader.push(headerName);
        }

        if (combinedHeader.includes('Work packages.ID')) {
            console.log('ID column found at index:', combinedHeader.indexOf('Work packages.ID'));
        }

        console.log('Combined header:', combinedHeader);

        const newData = data.slice(2).map(row =>
            combinedHeader.reduce((obj, header, i) => {
                obj[header] = row[i];
                return obj;
            }, {})
        );

        console.log('Flattened data sample:', newData.slice(0, 5)); // Log first 5 rows
        console.log('Flattened data length:', newData.length);

        return newData;
    } catch (error) {
        console.error('Error in flattenWorkbook:', error);
        throw error;
    }
}

function processData(data, openprojecturl) {
    try {
        const graphData = dfToGraph(data, openprojecturl);
        console.log('Processed nodes:', graphData.nodes.length);
        console.log('Processed edges:', graphData.edges.length);
        var ret = [...graphData.nodes, ...graphData.edges];
        console.log(ret);
        return ret;
    } catch (error) {
        console.error('Error in processData:', error);
        throw error;
    }
}

function dfToGraph(data, openprojecturl) {
    // Convert Work packages.ID and Relations.ID to integers, dropping rows with NaN values
    data = data.filter(row =>
        !isNaN(parseInt(row['Work packages.ID'])) &&
        !isNaN(parseInt(row['Relations.ID']))
    );

    // Create a dictionary to store unique nodes
    const uniqueNodes = {};

    // Process nodes
    data.forEach(row => {
        ['Work packages.ID', 'Relations.ID'].forEach(col => {
            const nodeId = row[col].toString();
            if (!uniqueNodes[nodeId]) {
                const baseCol = col.replace('ID', '');
                uniqueNodes[nodeId] = {
                    id: nodeId,
                    label: nodeId,
                    color: getStatusColor(row[`${baseCol}Status`]),
                    shape: getCytoscapeShape(row[`${baseCol}Type`]),
                    subject: row[`${baseCol}Subject`],
                    timespent: parseFloat(row[`${baseCol}Spent time`]),
                    _size: Math.sqrt(parseFloat(row[`${baseCol}Spent time`])) * 10 + 30,
                    status: row[`${baseCol}Status`],
                    priority: row[`${baseCol}Priority`],
                    type: row[`${baseCol}Type`],
                    assignee: row[`${baseCol}Assignee`],
                    accountable: row[`${baseCol}Accountable`],
                    url: `${openprojecturl}/work_packages/${nodeId}/activity`
                };
            }
        });
    });

    // Create nodes and edges for Cytoscape.js
    const nodes = Object.values(uniqueNodes).map(node => ({ data: node }));
    const edges = {};

    data.forEach(row => {
        const key = [row['Work packages.ID'], row['Relations.ID']];
        const invKey = [key[1], key[0]];
        if (!edges[key] && !edges[invKey]) {
            let relType = row['Relations.Relation type'];
            if (relType.toLowerCase().includes('child')) {
                key.reverse();
                relType = "parent of";
            }

            edges[key] = {
                data: {
                    source: key[0].toString(),
                    target: key[1].toString(),
                    label: row['Relations.Relation type'],
                    _color: getEdgeColor(relType),
                    _edgeline: getEdgeLine(relType)
                }
            };
        }
    });

    return {
        nodes: nodes,
        edges: Object.values(edges)
    };
}

// Helper functions
function getStatusColor(status) {
    status = status.toLowerCase().trim();
    const statusGroups = {
        'initial': ['new', 'to be scheduled'],
        'active': ['in progress', 'in development', 'in testing', 'in specification'],
        'paused': ['needhelp', 'on hold'],
        'completed': ['tested', 'completed', 'confirmed', 'developed', 'done', 'scheduled', 'specified'],
        'closed': ['closed'],
        'terminated': ['rejected', 'test failed']
    };
    const colors = {
        'initial': '#99CCFF',
        'active': '#66CC66',
        'paused': '#FFCC00',
        'completed': '#0033FF',
        'closed': '#4D4D4D',
        'terminated': '#CC3311'
    };
    for (const [group, statuses] of Object.entries(statusGroups)) {
        if (statuses.includes(status)) {
            return colors[group];
        }
    }
    return "#AABBCC";
}

function getCytoscapeShape(workPackageType) {
    workPackageType = workPackageType.toLowerCase().trim();
    const shapeMapping = {
        'task': 'round-rectangle',
        'milestone': 'vee',
        'phase': 'hexagon',
        'feature': 'triangle',
        'epic': 'octagon',
        'user story': 'ellipse',
        'bug': 'diamond',
        'risk': 'star',
        'issue': 'right-rhomboid'
    };
    return shapeMapping[workPackageType] || 'ellipse';
}

function getEdgeColor(relType) {
    if (relType.toLowerCase().includes('parent') || relType.toLowerCase().includes('child')) {
        return "#bbb";
    } else {
        return "#000";
    }
}

function getEdgeLine(relType) {
    if (relType.toLowerCase().includes('parent') || relType.toLowerCase().includes('child')) {
        return "dotted";
    } else {
        return "solid";
    }
}

function renderGraph(elements) {
    try {
        const container = document.getElementById('cy');
        if (!container) {
            throw new Error('Graph container not found');
        }

        const cy = cytoscape({
            container: container,
            elements: elements,
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'shape': 'data(shape)',
                        'text-valign': 'center',
                        'font-size': '10%',
                        'text-halign': 'center',
                        'text-valign': 'center',
                        'background-color': 'data(color)',
                        'width': 'data(_size)',
                        'height': 'data(_size)'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'curve-style': 'bezier',
                        'target-arrow-shape': 'triangle',
                        'width': 2,
                        'line-color': 'data(_color)',
                        'target-arrow-color': 'data(_color)',
                        'line-style': 'data(_edgeline)',
                    }
                }
            ],
            layout: {
                name: 'cose',
                animate: false,
            }
        });

        var tooltip = document.getElementById('tooltip');

        // Add tooltip functionality
        cy.on('mouseover', 'node', function (event) {
            var node = event.target;
            var tooltipText = node.data('status') +
                ' ' + node.data('type').toUpperCase() +
                ' ' + node.data('timespent') + " hrs" +
                '' + node.data('subject');
            tooltip.innerHTML = tooltipText;
            tooltip.style.left = event.renderedPosition.x + 'px';
            tooltip.style.top = event.renderedPosition.y + 'px';
            tooltip.style.display = 'block';
        });

        cy.on('mouseover', 'edge', function (event) {
            var edge = event.target;
            var tooltipText = edge.data('label');
            tooltip.innerHTML = tooltipText;
            tooltip.style.left = event.renderedPosition.x + 'px';
            tooltip.style.top = event.renderedPosition.y + 'px';
            tooltip.style.display = 'block';
        });

        cy.on('mouseout', 'node, edge', function () {
            tooltip.style.display = 'none';
        });

        // Add click event
        cy.on('tap', 'node', function (evt) {
            var node = evt.target;
            var url = node.data('url');
            if (url) {
                window.open(url, '_blank');
            } else {
                console.log('No URL available for this node');
            }
        });

        console.log('Graph rendered successfully');
    } catch (error) {
        console.error('Error in renderGraph:', error);
    }
}

// When the page loads, retrieve the saved URL and set it in the input field
document.addEventListener('DOMContentLoaded', function () {
    const savedUrl = localStorage.getItem('openprojectUrl');
    if (savedUrl) {
        document.getElementById('openprojectUrl').value = savedUrl;
    }

    // Load saved graph data from localStorage
    const savedGraphData = localStorage.getItem('graphData');
    if (savedGraphData) {
        const elements = JSON.parse(savedGraphData);
        renderGraph(elements);
        console.log('Graph data loaded from localStorage');
    }
});

// Add event listener to file input
document.getElementById('fileInput').addEventListener('change', handleFileSelect, false);
