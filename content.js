(function() {
    'use strict';

    // Prevent multiple instances
    if (window.gradeTrackerInitialized) {
        console.log('Grade tracker already initialized');
        return;
    }
    window.gradeTrackerInitialized = true;

    console.log('Grade tracker starting...');

    class GradeTracker {
        constructor() {
            this.classes = new Map();
            this.observer = null;
            this.debounceTimer = null;
            this.visibilityUpdateTimer = null;
            this.classObservers = [];
            this.isProcessing = false;
            this.processed = false;
            this.init();
        }

        init() {
            console.log('Initializing grade tracker');
            console.log('Document ready state:', document.readyState);
            
            // Wait for the page to be fully loaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.debouncedProcessGrades(), { once: true });
            } else {
                this.debouncedProcessGrades();
            }
            
            // Set up filter observation
            this.setupFilterObservation();
        }

        debouncedProcessGrades() {
            console.log('Debounced process grades called');
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }
            
            this.debounceTimer = setTimeout(() => {
                this.processGrades();
            }, 1000); // Increased timeout for debugging
        }

        processGrades() {
            if (this.isProcessing) {
                console.log('Already processing, skipping');
                return;
            }
            this.isProcessing = true;
            
            console.log('Starting grade processing...');
            
            try {
                this.parseGrades();
                this.injectVisualizations();
                this.processed = true;
                console.log('Grade processing completed successfully');
            } catch (error) {
                console.error('Grade tracker error:', error);
            } finally {
                this.isProcessing = false;
            }
        }

        parseGrades() {
            console.log('Parsing grades...');
            this.classes.clear();
            
            // Find all class containers - they are divs with IDs inside the #list container
            const listContainer = document.getElementById('list');
            console.log('List container found:', !!listContainer);
            
            if (!listContainer) {
                console.log('No list container found, cannot parse grades');
                return;
            }
            
            const classContainers = listContainer.querySelectorAll(':scope > div[id]');
            console.log('Found class containers:', classContainers.length);
            
            classContainers.forEach((container, index) => {
                const classId = container.id;
                console.log(`Processing class ${index + 1}: ${classId}`);
                
                if (!classId) {
                    console.log('Skipping container without ID');
                    return;
                }
                
                const classData = this.parseClassData(container);
                if (classData) {
                    console.log(`Parsed class ${classId}:`, classData);
                    this.classes.set(classId, classData);
                } else {
                    console.log(`Failed to parse class ${classId}`);
                }
            });
            
            console.log(`Total classes parsed: ${this.classes.size}`);
        }

        parseClassData(container) {
            const titleElement = container.querySelector('.ap-title');
            console.log('Title element found:', !!titleElement);
            
            if (!titleElement) return null;
            
            const className = titleElement.textContent.trim();
            console.log('Class name:', className);
            
            const evaluations = [];
            
            // Find all score elements with column-total class, but exclude row-total (summary rows)
            const scoreElements = container.querySelectorAll('.result.column-total:not(.row-total)');
            console.log(`Found ${scoreElements.length} score elements`);
            
            // Get evaluation names - they're in .column-evaluation elements
            const evaluationElements = container.querySelectorAll('.column-evaluation');
            console.log(`Found ${evaluationElements.length} evaluation elements`);
            
            scoreElements.forEach((scoreElement, index) => {
                const score = this.parseScore(scoreElement);
                console.log(`Score ${index}:`, score);
                
                let evalName = 'Unknown';
                if (evaluationElements[index]) {
                    evalName = this.getEvaluationName(evaluationElements[index]);
                }
                
                if (score !== null) {
                    // Completed evaluation
                    evaluations.push({
                        name: evalName,
                        score: score.score,
                        total: score.total,
                        percentage: score.percentage
                    });
                } else {
                    // Incomplete evaluation - still add it for total calculation
                    const totalDiv = scoreElement.querySelector('.total');
                    if (totalDiv) {
                        const totalText = totalDiv.textContent.trim();
                        const total = parseFloat(totalText);
                        if (!isNaN(total) && total > 0) {
                            evaluations.push({
                                name: evalName,
                                score: null,
                                total: total,
                                percentage: null
                            });
                        }
                    }
                }
            });
            
            console.log(`Class ${className} has ${evaluations.filter(e => e.percentage !== null).length} completed evaluations out of ${evaluations.length} total evaluations`);
            
            return {
                name: className,
                evaluations: evaluations,
                container: container
            };
        }

        getEvaluationName(evalElement) {
            return window.GradeCalculations.getEvaluationName(evalElement);
        }

        parseScore(scoreElement) {
            return window.GradeCalculations.parseScore(scoreElement);
        }

        calculateTrends(evaluations) {
            return window.GradeCalculations.calculateTrends(evaluations);
        }

        createGraph(cumulativePoints, width = 324, height = 200) {
            console.log('Creating SVG graph with points:', cumulativePoints);
            
            // Create SVG element
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', width);
            svg.setAttribute('height', height);
            svg.setAttribute('class', 'grade-graph');
            svg.setAttribute('role', 'img');
            svg.setAttribute('aria-label', 'Grade progression graph showing cumulative grade vs class completion');
            
            // Create background
            const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            background.setAttribute('width', width);
            background.setAttribute('height', height);
            background.setAttribute('fill', '#ffffff');
            svg.appendChild(background);
            
            // Create grid group
            const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            gridGroup.setAttribute('class', 'grid');
            gridGroup.setAttribute('stroke', '#e0e0e0');
            gridGroup.setAttribute('stroke-width', '1');
            
            // Vertical grid lines (every 25%)
            for (let x = 0; x <= 100; x += 25) {
                const xPos = (x / 100) * width;
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', xPos);
                line.setAttribute('y1', 0);
                line.setAttribute('x2', xPos);
                line.setAttribute('y2', height);
                gridGroup.appendChild(line);
            }
            
            // Horizontal grid lines (every 25%)
            for (let y = 0; y <= 100; y += 25) {
                const yPos = height - (y / 100) * height;
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', 0);
                line.setAttribute('y1', yPos);
                line.setAttribute('x2', width);
                line.setAttribute('y2', yPos);
                gridGroup.appendChild(line);
            }
            
            svg.appendChild(gridGroup);
            
            // Create 50% reference line (horizontal)
            const y50 = height - (50 / 100) * height;
            const refLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            refLine.setAttribute('x1', 0);
            refLine.setAttribute('y1', y50);
            refLine.setAttribute('x2', width);
            refLine.setAttribute('y2', y50);
            refLine.setAttribute('stroke', '#ff9800');
            refLine.setAttribute('stroke-width', '2');
            refLine.setAttribute('stroke-dasharray', '3,3');
            refLine.setAttribute('aria-label', '50% grade reference line');
            svg.appendChild(refLine);
            
            // Create diagonal reference line (perfect 100% progression)
            const diagLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            diagLine.setAttribute('x1', 0);
            diagLine.setAttribute('y1', height);
            diagLine.setAttribute('x2', width);
            diagLine.setAttribute('y2', 0);
            diagLine.setAttribute('stroke', '#cccccc');
            diagLine.setAttribute('stroke-width', '2');
            diagLine.setAttribute('stroke-dasharray', '5,5');
            diagLine.setAttribute('aria-label', 'Perfect 100% progression reference line');
            svg.appendChild(diagLine);
            
            // Create progression line and points (only for completed evaluations)
            if (cumulativePoints.length > 0) {
                // Create path for progression line
                let pathData = `M 0 ${height}`; // Start from origin
                
                cumulativePoints.forEach(point => {
                    const x = (point.x / 100) * width;
                    const y = height - (point.y / 100) * height;
                    pathData += ` L ${x} ${y}`;
                });
                
                const progressPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                progressPath.setAttribute('d', pathData);
                progressPath.setAttribute('stroke', '#2196F3');
                progressPath.setAttribute('stroke-width', '3');
                progressPath.setAttribute('fill', 'none');
                progressPath.setAttribute('aria-label', 'Your actual grade progression');
                svg.appendChild(progressPath);
                
                // Create points for completed evaluations with accessibility features
                cumulativePoints.forEach((point, index) => {
                    const x = (point.x / 100) * width;
                    const y = height - (point.y / 100) * height;
                    
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', x);
                    circle.setAttribute('cy', y);
                    circle.setAttribute('r', 4);
                    circle.setAttribute('fill', '#2196F3');
                    circle.setAttribute('stroke', '#ffffff');
                    circle.setAttribute('stroke-width', '1');
                    
                    // Add accessibility features
                    const evaluation = point.evaluation;
                    const scoreText = `${evaluation.score}/${evaluation.total} (${evaluation.percentage.toFixed(1)}%)`;
                    const ariaLabel = `${evaluation.name}: ${scoreText}`;
                    
                    circle.setAttribute('aria-label', ariaLabel);
                    circle.setAttribute('role', 'img');
                    
                    // Add title for hover tooltip
                    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                    title.textContent = ariaLabel;
                    circle.appendChild(title);
                    
                    // Add class for potential CSS styling
                    circle.setAttribute('class', 'data-point');
                    circle.setAttribute('data-evaluation-index', index);
                    
                    svg.appendChild(circle);
                });
            }
            
            // Create axes labels group
            const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            labelsGroup.setAttribute('fill', '#666666');
            labelsGroup.setAttribute('font-family', 'Arial');
            labelsGroup.setAttribute('font-size', '10px');
            
            // Bottom left (0%)
            const label0 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label0.setAttribute('x', 2);
            label0.setAttribute('y', height - 2);
            label0.textContent = '0%';
            labelsGroup.appendChild(label0);
            
            // Bottom right (100% Evaluated)
            const label100Eval = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label100Eval.setAttribute('x', width - 90);
            label100Eval.setAttribute('y', height - 2);
            label100Eval.textContent = '100% Evaluated';
            labelsGroup.appendChild(label100Eval);
            
            // Top left (100% Grade)
            const label100Grade = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label100Grade.setAttribute('x', 2);
            label100Grade.setAttribute('y', 12);
            label100Grade.textContent = '100% Grade';
            labelsGroup.appendChild(label100Grade);
            
            // 50% label
            const label50 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label50.setAttribute('x', width - 20);
            label50.setAttribute('y', y50 - 5);
            label50.textContent = '50%';
            labelsGroup.appendChild(label50);
            
            svg.appendChild(labelsGroup);
            
            return svg;
        }

        createTrendDisplay(trends) {
            const container = document.createElement('div');
            container.className = 'grade-trends';
            
            // Calculate required trend for A (90%)
            const requiredForA = window.GradeCalculations.calculateRequiredTrend(trends.evaluations, 90);
            
            // Determine styling classes
            const currentTrendClass = trends.currentTrend >= 50 ? 'trend-positive' : 'trend-negative';
            
            let requiredDClass = 'trend-neutral';
            if (trends.requiredTrend === 0) {
                requiredDClass = 'trend-positive'; // Already on track
            } else if (trends.requiredTrend <= 100) {
                requiredDClass = 'trend-neutral'; // Achievable
            } else {
                requiredDClass = 'trend-negative'; // Very difficult
            }
            
            let requiredAClass = 'trend-neutral';
            if (requiredForA === 0) {
                requiredAClass = 'trend-positive'; // Already on track
            } else if (requiredForA <= 100) {
                requiredAClass = 'trend-neutral'; // Achievable
            } else {
                requiredAClass = 'trend-negative'; // Very difficult
            }
            
            const remainingClass = 'trend-neutral';
            
            const table = document.createElement('table');
            table.className = 'trends-table';
            
            const row1 = document.createElement('tr');
            
            const cell1 = document.createElement('td');
            cell1.className = 'trend-cell';
            const label1 = document.createElement('div');
            label1.className = 'trend-label';
            label1.textContent = 'Required for D';
            const value1 = document.createElement('div');
            value1.className = `trend-value ${requiredDClass}`;
            value1.textContent = `${trends.requiredTrend.toFixed(1)}%`;
            cell1.appendChild(label1);
            cell1.appendChild(value1);
            
            const cell2 = document.createElement('td');
            cell2.className = 'trend-cell';
            const label2 = document.createElement('div');
            label2.className = 'trend-label';
            label2.textContent = 'Required for A';
            const value2 = document.createElement('div');
            value2.className = `trend-value ${requiredAClass}`;
            value2.textContent = `${requiredForA.toFixed(1)}%`;
            cell2.appendChild(label2);
            cell2.appendChild(value2);
            
            row1.appendChild(cell1);
            row1.appendChild(cell2);
            
            const row2 = document.createElement('tr');
            
            const cell3 = document.createElement('td');
            cell3.className = 'trend-cell';
            const label3 = document.createElement('div');
            label3.className = 'trend-label';
            label3.textContent = 'Current Trend';
            const value3 = document.createElement('div');
            value3.className = `trend-value ${currentTrendClass}`;
            value3.textContent = `${trends.currentTrend.toFixed(1)}%`;
            cell3.appendChild(label3);
            cell3.appendChild(value3);
            
            const cell4 = document.createElement('td');
            cell4.className = 'trend-cell';
            const label4 = document.createElement('div');
            label4.className = 'trend-label';
            label4.textContent = 'Remaining';
            const value4 = document.createElement('div');
            value4.className = `trend-value ${remainingClass}`;
            value4.textContent = `${trends.remainingPercentage.toFixed(1)}%`;
            cell4.appendChild(label4);
            cell4.appendChild(value4);
            
            row2.appendChild(cell3);
            row2.appendChild(cell4);
            
            table.appendChild(row1);
            table.appendChild(row2);
            container.appendChild(table);
            
            return container;
        }

        injectVisualizations() {
            console.log('Injecting visualizations...');
            
            // Remove existing visualizations to prevent duplicates
            const existingViz = document.querySelectorAll('.grade-graph-container');
            console.log(`Removing ${existingViz.length} existing visualizations`);
            existingViz.forEach(el => el.remove());
            
            if (this.classes.size === 0) {
                console.log('No classes to visualize');
                return;
            }
            
            console.log(`Creating visualizations for ${this.classes.size} classes`);
            
            this.classes.forEach((classData, classId) => {
                console.log(`Processing visualization for ${classId}`);
                
                if (classData.evaluations.length === 0) {
                    console.log(`Skipping ${classId} - no evaluations`);
                    return;
                }
                
                const trends = this.calculateTrends(classData.evaluations);
                
                // Find the class title element within this class container
                const titleElement = classData.container.querySelector('.ap-title');
                if (!titleElement) {
                    console.log(`No title element found for ${classId}`);
                    return;
                }
                
                // Find the subtitle element (class name) - this is where we want to place the graph after
                const subtitleElement = titleElement.parentNode.querySelector('.subtitle');
                const insertAfterElement = subtitleElement || titleElement; // fallback to title if no subtitle
                
                // Create visualization container with much smaller dimensions
                const vizContainer = document.createElement('div');
                vizContainer.className = 'grade-graph-container';
                vizContainer.setAttribute('data-class-id', classId);
                
                // Create graph with square dimensions (1:1 aspect ratio)
                const graph = this.createGraph(trends.cumulativePoints, 246, 246);
                vizContainer.appendChild(graph);
                
                // Create compact trend display
                const trendDisplay = this.createTrendDisplay(trends);
                vizContainer.appendChild(trendDisplay);
                
                // Insert the graph after the subtitle element (class name), not the title (class code)
                insertAfterElement.parentNode.insertBefore(vizContainer, insertAfterElement.nextSibling);
                
                // Mark the class container so we know it has a graph
                classData.container.setAttribute('data-has-graph', 'true');
                
                console.log(`Injected visualization for ${classId} below class name (subtitle)`); 
            });
            
            console.log('Visualization injection complete');
        }

        observeSemesterChanges() {
            const semesterSelect = document.getElementById('trimesters');
            if (!semesterSelect) {
                console.log('No semester select found');
                return;
            }

            console.log('Setting up semester change observation');
            
            // Listen for changes to the semester dropdown
            semesterSelect.addEventListener('change', () => {
                console.log('Semester changed, reinitializing grade tracker...');
                
                // Clear existing data and visualizations
                this.classes.clear();
                const existingViz = document.querySelectorAll('.grade-graph-container');
                existingViz.forEach(el => el.remove());
                
                // Reset processing flag
                this.processed = false;
                
                // Wait for new content to load, then reprocess
                setTimeout(() => {
                    this.debouncedProcessGrades();
                }, 1500); // Give some time for the new semester data to load
            });

            // Also observe for DOM changes in the list container when semester changes
            const listContainer = document.getElementById('list');
            if (listContainer) {
                const listObserver = new MutationObserver((mutations) => {
                    // Check if significant content has changed (new classes added/removed)
                    let hasSignificantChange = false;
                    
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' && 
                            (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                            // Check if added/removed nodes are class containers (have IDs)
                            const relevantNodes = [...mutation.addedNodes, ...mutation.removedNodes].filter(node => 
                                node.nodeType === Node.ELEMENT_NODE && node.id
                            );
                            if (relevantNodes.length > 0) {
                                hasSignificantChange = true;
                            }
                        }
                    });
                    
                    if (hasSignificantChange && !this.isProcessing) {
                        console.log('Significant content change detected, reprocessing grades...');
                        
                        // Clear existing visualizations
                        const existingViz = document.querySelectorAll('.grade-graph-container');
                        existingViz.forEach(el => el.remove());
                        
                        // Reset and reprocess
                        this.processed = false;
                        this.debouncedProcessGrades();
                    }
                });
                
                listObserver.observe(listContainer, { 
                    childList: true, 
                    subtree: true 
                });
            }
        }

        setupFilterObservation() {
            // Wait a bit for the page to fully load before setting up observers
            setTimeout(() => {
                this.observeFilterChanges();
                this.observeSemesterChanges();
            }, 2000);
        }

        observeFilterChanges() {
            const filterContainer = document.getElementById('ap-filter');
            if (!filterContainer) {
                console.log('No filter container found');
                return;
            }

            console.log('Setting up filter observation');
            
            // Watch for filter state changes using MutationObserver
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && 
                        mutation.attributeName === 'class' &&
                        mutation.target.classList.contains('filter')) {
                        console.log('Filter state changed:', mutation.target.textContent.trim());
                        shouldUpdate = true;
                    }
                });
                if (shouldUpdate) {
                    // Debounce updates
                    clearTimeout(this.visibilityUpdateTimer);
                    this.visibilityUpdateTimer = setTimeout(() => this.updateGraphVisibility(), 50);
                }
            });
            
            // Observe all filter buttons
            const filters = filterContainer.querySelectorAll('.filter');
            console.log(`Found ${filters.length} filter buttons`);
            
            filters.forEach(filter => {
                observer.observe(filter, { attributes: true });
                // Also add click listener as backup
                filter.addEventListener('click', () => {
                    clearTimeout(this.visibilityUpdateTimer);
                    this.visibilityUpdateTimer = setTimeout(() => this.updateGraphVisibility(), 100);
                });
            });

            // Observe each class container for visibility changes
            this.classes.forEach((classData, classId) => {
                const classContainer = document.getElementById(classId);
                if (classContainer) {
                    const classObserver = new MutationObserver(() => {
                        clearTimeout(this.visibilityUpdateTimer);
                        this.visibilityUpdateTimer = setTimeout(() => this.updateGraphVisibility(), 50);
                    });
                    
                    classObserver.observe(classContainer, { 
                        attributes: true, 
                        attributeFilter: ['class', 'style'] 
                    });
                    
                    // Store observer for cleanup if needed
                    if (!this.classObservers) this.classObservers = [];
                    this.classObservers.push(classObserver);
                }
            });
        }

        updateGraphVisibility() {
            if (!this.classes || this.classes.size === 0) {
                console.log('No classes to update visibility for');
                return;
            }

            console.log('Updating graph visibility based on filter state');
            
            // Check if any filters are active
            const filterContainer = document.getElementById('ap-filter');
            let activeFilters = [];
            let hasActiveFilters = false;
            
            if (filterContainer) {
                const enabledFilters = filterContainer.querySelectorAll('.filter.enabled');
                activeFilters = Array.from(enabledFilters).map(f => f.textContent.trim());
                hasActiveFilters = activeFilters.length > 0;
                console.log('Active filters:', activeFilters);
            }
            
            // Check each class container's visibility and sync the graph
            this.classes.forEach((classData, classId) => {
                const classContainer = document.getElementById(classId);
                const graphContainer = classContainer ? classContainer.querySelector(`.grade-graph-container[data-class-id="${classId}"]`) : null;
                
                if (graphContainer && classContainer) {
                    let shouldShow = true;
                    
                    // If there are active filters, check if this class is in the active list
                    if (hasActiveFilters) {
                        shouldShow = activeFilters.includes(classId);
                    }
                    
                    // Also check the actual class container visibility
                    const isClassHidden = classContainer.classList.contains('hide') || 
                                        classContainer.style.display === 'none' ||
                                        window.getComputedStyle(classContainer).display === 'none';
                    
                    // Since the graph is now a sibling of the title element within the class container,
                    // it should follow the class container's visibility
                    if (!shouldShow || isClassHidden) {
                        console.log(`Hiding graph for ${classId}`);
                        graphContainer.style.display = 'none';
                        graphContainer.classList.add('hide');
                    } else {
                        console.log(`Showing graph for ${classId}`);
                        graphContainer.style.display = 'block';
                        graphContainer.classList.remove('hide');
                    }
                }
            });
        }
    }

    // Initialize the grade tracker with error handling
    try {
        console.log('Creating GradeTracker instance');
        new GradeTracker();
    } catch (error) {
        console.error('Failed to initialize grade tracker:', error);
    }
})();