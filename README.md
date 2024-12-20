# openproject-cytoscape

[Try it here](https://weberon.github.io/openproject-cytoscape)

A Progressive Web App to Visualize OpenProject work package relationships as a Network Graph

### Instructions

- Export work packages from openproject as [XLS with relations](https://www.openproject.org/docs/user-guide/work-packages/exporting/#xls-with-relations) with these columns - Status,Type,Spent time,Subject,Priority,Assignee,Accountable

- Visit https://weberon.github.io/openproject-cytoscape

- Set the domain of your Open Project server

- Choose the XLS file downloaded from OpenProject and wait for the graph to be rendered.
- Nodes
  - shape is determined by work package Type
  - color is determined by Status
  - size is determined by Spent time
  - hover on node to see details
  - click on node to open the workpackage in OpenProject
- Edge
  - color and style are determined by "Parent, Child" or otherwise
  - hover on edge to see the edge Type

### Screenshot

![screen](https://github.com/user-attachments/assets/2ee89fb4-ef59-4b49-906d-dd18053165c9)
