// Grade calculation utilities for the grade tracker extension
(function() {
    'use strict';

    window.GradeCalculations = {
        parseScore: function(scoreElement) {
            const scoreDiv = scoreElement.querySelector('.score');
            const totalDiv = scoreElement.querySelector('.total');
            
            if (!scoreDiv || !totalDiv) {
                console.log('Missing score or total div');
                return null;
            }
            
            const scoreText = scoreDiv.textContent.trim();
            const totalText = totalDiv.textContent.trim();
            
            console.log(`Raw score: "${scoreText}", total: "${totalText}"`);
            
            // Skip incomplete evaluations (marked with '-' or empty)
            if (scoreText === '-' || scoreText === '') {
                console.log('Skipping incomplete evaluation');
                return null;
            }
            
            const score = parseFloat(scoreText);
            const total = parseFloat(totalText);
            
            if (isNaN(score) || isNaN(total) || total === 0) {
                console.log('Invalid score or total');
                return null;
            }
            
            return {
                score: score,
                total: total,
                percentage: (score / total) * 100
            };
        },

        getEvaluationName: function(evalElement) {
            const subtitleElement = evalElement.querySelector('.subtitle');
            const divElements = evalElement.querySelectorAll('div');
            
            let subtitle = '';
            let name = '';
            
            if (subtitleElement) {
                subtitle = subtitleElement.textContent.trim();
            }
            
            // Find the last div that's not a subtitle or comment
            for (let i = divElements.length - 1; i >= 0; i--) {
                const div = divElements[i];
                if (!div.classList.contains('subtitle') && 
                    !div.classList.contains('comment') &&
                    !div.classList.contains('popup') &&
                    div.textContent.trim() !== '') {
                    name = div.textContent.trim();
                    break;
                }
            }
            
            return subtitle && name ? `${subtitle} - ${name}` : (name || subtitle || 'Unknown');
        },

        calculateTrends: function(evaluations) {
            console.log('Calculating trends for evaluations:', evaluations);
            
            // Separate completed and incomplete evaluations
            const completedEvals = evaluations.filter(e => e.percentage !== null && e.percentage !== undefined);
            const incompleteEvals = evaluations.filter(e => e.percentage === null || e.percentage === undefined);
            
            // Sort so completed evaluations come first, then incomplete ones
            const sortedEvaluations = [...completedEvals, ...incompleteEvals];
            
            if (completedEvals.length === 0) {
                return {
                    currentTrend: 0,
                    requiredTrend: 50,
                    remainingPercentage: 100,
                    cumulativePoints: [],
                    evaluations: evaluations
                };
            }
            
            // Calculate cumulative progression based on percentage of total grade earned
            let cumulativeGradeEarned = 0; // Total percentage of final grade earned so far
            let cumulativeGradeAvailable = 0; // Total percentage of final grade that has been evaluated
            const cumulativePoints = [];
            
            // Calculate total possible points for the class (including incomplete evaluations)
            const totalPossiblePoints = evaluations.reduce((sum, evaluation) => sum + evaluation.total, 0);
            console.log(`Total possible points: ${totalPossiblePoints}, Completed evaluations: ${completedEvals.length}, Total evaluations: ${evaluations.length}`);
            
            // Only process completed evaluations for the line
            completedEvals.forEach((evaluation, index) => {
                // Calculate what percentage of total grade this evaluation represents
                const evaluationWeight = (evaluation.total / totalPossiblePoints) * 100;
                
                // Calculate what percentage of total grade was earned on this evaluation
                const gradeEarnedOnEvaluation = (evaluation.score / evaluation.total) * evaluationWeight;
                
                cumulativeGradeEarned += gradeEarnedOnEvaluation;
                cumulativeGradeAvailable += evaluationWeight;
                
                console.log(`Eval ${index}: ${evaluation.total}pts (${evaluationWeight.toFixed(1)}%), cumulative_available=${cumulativeGradeAvailable.toFixed(1)}%`);
                
                cumulativePoints.push({
                    x: cumulativeGradeAvailable, // X: How much of class grade has been evaluated
                    y: cumulativeGradeEarned,    // Y: How much of total possible grade has been earned
                    evaluation: evaluation        // Include evaluation data for tooltips/alt-text
                });
            });
            
            // Calculate current trend (current average performance rate on completed work)
            // This is: (total grade earned so far) / (total grade available so far) * 100
            let currentTrend = 0;
            if (cumulativeGradeAvailable > 0) {
                currentTrend = (cumulativeGradeEarned / cumulativeGradeAvailable) * 100;
            }
            
            // Calculate required trend for remaining evaluations to reach 50%
            const remainingGradeAvailable = 100 - cumulativeGradeAvailable;
            const gradeNeededFor50Percent = 50 - cumulativeGradeEarned;
            
            let requiredTrend = 0;
            if (remainingGradeAvailable > 0 && gradeNeededFor50Percent > 0) {
                // What average performance rate needed on remaining evaluations to reach 50% total
                requiredTrend = (gradeNeededFor50Percent / remainingGradeAvailable) * 100;
            }
            // If already above 50% accumulated, no additional performance needed
            if (cumulativeGradeEarned >= 50) {
                requiredTrend = 0;
            }
            
            const trends = {
                currentTrend: currentTrend,
                requiredTrend: requiredTrend,
                remainingPercentage: remainingGradeAvailable,
                cumulativePoints: cumulativePoints,
                evaluations: evaluations,
                cumulativeGradeEarned: cumulativeGradeEarned,
                cumulativeGradeAvailable: cumulativeGradeAvailable
            };
            
            console.log('Calculated trends:', trends);
            return trends;
        },

        calculateRequiredTrend: function(evaluations, targetPercentage) {
            // Use the same calculation logic as calculateTrends but for a custom target
            const completedEvals = evaluations.filter(e => e.percentage !== null && e.percentage !== undefined);
            
            if (completedEvals.length === 0) {
                return targetPercentage;
            }
            
            // Calculate cumulative grade earned and available
            let cumulativeGradeEarned = 0;
            let cumulativeGradeAvailable = 0;
            
            // Calculate total possible points for the class (including incomplete evaluations)
            const totalPossiblePoints = evaluations.reduce((sum, evaluation) => sum + evaluation.total, 0);
            
            // Only process completed evaluations
            completedEvals.forEach((evaluation) => {
                // Calculate what percentage of total grade this evaluation represents
                const evaluationWeight = (evaluation.total / totalPossiblePoints) * 100;
                
                // Calculate what percentage of total grade was earned on this evaluation
                const gradeEarnedOnEvaluation = (evaluation.score / evaluation.total) * evaluationWeight;
                
                cumulativeGradeEarned += gradeEarnedOnEvaluation;
                cumulativeGradeAvailable += evaluationWeight;
            });
            
            // Calculate required trend for remaining evaluations to reach target percentage
            const remainingGradeAvailable = 100 - cumulativeGradeAvailable;
            const gradeNeededForTarget = targetPercentage - cumulativeGradeEarned;
            
            let requiredTrend = 0;
            if (remainingGradeAvailable > 0 && gradeNeededForTarget > 0) {
                // What average performance rate needed on remaining evaluations to reach target
                requiredTrend = (gradeNeededForTarget / remainingGradeAvailable) * 100;
            }
            // If already above target accumulated, no additional performance needed
            if (cumulativeGradeEarned >= targetPercentage) {
                requiredTrend = 0;
            }
            
            return requiredTrend;
        }
    };
})();