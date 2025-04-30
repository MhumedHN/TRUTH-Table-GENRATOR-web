document.addEventListener('DOMContentLoaded', function() {
    const inputExpression = document.getElementById('input-expression');
    const conditionValue = document.getElementById('condition-value');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');
    const resultContainer = document.getElementById('result-container');
    const truthTable = document.getElementById('truth-table');
    
    // Mode buttons
    const modeButtons = document.querySelectorAll('[data-mode]');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            updateExpressionPart(2, btn.getAttribute('data-mode'));
        });
    });
    
    // Metric buttons
    const metricButtons = document.querySelectorAll('[data-metric]');
    metricButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            updateExpressionPart(3, btn.getAttribute('data-metric'));
        });
    });
    
    // Operator buttons
    const operatorButtons = document.querySelectorAll('[data-operator]');
    operatorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            updateExpressionPart(4, btn.getAttribute('data-operator'));
        });
    });
    
    // Clear input
    clearBtn.addEventListener('click', () => {
        inputExpression.value = '';
        inputExpression.focus();
    });
    
    // Generate truth table
    generateBtn.addEventListener('click', generateTruthTable);
    
    // Copy table to clipboard
    copyBtn.addEventListener('click', copyTableToClipboard);
    
    // Handle Enter key in input expression
    inputExpression.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            generateTruthTable();
        }
    });
    
    // Update specific part of the expression
    function updateExpressionPart(partIndex, newValue) {
        const currentValue = inputExpression.value.trim();
        if (!currentValue) {
            inputExpression.value = `(A,B,C) when ${partIndex === 2 ? newValue : '1s'} ${partIndex === 3 ? newValue : 'sum'} ${partIndex === 4 ? newValue : '>='} ${conditionValue.value || '1'}`;
            return;
        }
        
        const parts = currentValue.split(' ');
        if (parts.length < 5) {
            // Not enough parts, build a complete expression
            const vars = parts[0] || '(A,B,C)';
            const when = parts[1] || 'when';
            const mode = partIndex === 2 ? newValue : (parts[2] || '1s');
            const metric = partIndex === 3 ? newValue : (parts[3] || 'sum');
            const operator = partIndex === 4 ? newValue : (parts[4] || '>=');
            const value = conditionValue.value || '1';
            
            inputExpression.value = `${vars} ${when} ${mode} ${metric} ${operator} ${value}`;
        } else {
            // Replace the specific part
            parts[partIndex] = newValue;
            inputExpression.value = parts.join(' ');
        }
        
        // Update condition value if it's part 5
        if (partIndex === 5) {
            conditionValue.value = newValue;
        }
    }
    
    function generateTruthTable() {
        const expression = inputExpression.value.trim();
        
        if (!expression) {
            showError('Please enter an expression');
            return;
        }
        
        try {
            const { variables, mode, metric, operator, value } = parseExpression(expression);
            const tableData = calculateTruthTable(variables, mode, metric, operator, value);
            displayTruthTable(tableData, variables, mode, metric, operator, value);
            resultContainer.classList.remove('hidden');
        } catch (error) {
            showError(error.message);
        }
    }
    
    function parseExpression(expression) {
        // Basic validation
        if (!expression.includes('when')) {
            throw new Error('Expression must contain "when" keyword');
        }
        
        // Split into parts
        const parts = expression.split(' ');
        if (parts.length < 6) {
            throw new Error('Invalid expression format. Expected: (vars) when [1s|0s] [metric] [operator] [value]');
        }
        
        // Extract variables
        const varsPart = parts[0];
        if (!varsPart.startsWith('(') || !varsPart.endsWith(')')) {
            throw new Error('Variables must be enclosed in parentheses');
        }
        
        const variables = varsPart.slice(1, -1).split(',').map(v => v.trim()).filter(v => v);
        if (variables.length === 0) {
            throw new Error('At least one variable is required');
        }
        
        // Check for invalid variable names
        const invalidVars = variables.filter(v => !/^[A-Za-z]$/.test(v));
        if (invalidVars.length > 0) {
            throw new Error(`Invalid variable names: ${invalidVars.join(', ')}. Use single letters only.`);
        }
        
        // Extract mode (1s or 0s)
        const mode = parts[2].toLowerCase();
        if (mode !== '1s' && mode !== '0s') {
            throw new Error('Mode must be either "1s" or "0s"');
        }
        
        // Extract metric
        const metric = parts[3].toLowerCase();
        const validMetrics = ['sum', 'value', 'odd', 'even'];
        if (!validMetrics.includes(metric)) {
            throw new Error(`Invalid metric. Must be one of: ${validMetrics.join(', ')}`);
        }
        
        // Extract operator
        const operator = parts[4];
        const validOperators = ['==', '!=', '>', '>=', '<', '<='];
        if (!validOperators.includes(operator)) {
            throw new Error(`Invalid operator. Must be one of: ${validOperators.join(', ')}`);
        }
        
        // Extract value
        const value = parseFloat(parts[5]);
        if (isNaN(value)) {
            throw new Error('Condition value must be a number');
        }
        
        return { variables, mode, metric, operator, value };
    }
    
    function calculateTruthTable(variables, mode, metric, operator, conditionValue) {
        const numVars = variables.length;
//        const numRows = Math.pow(2, numVars);
        //1 << numVars
        const numRows = 1 <<  numVars;

        const table = [];
        
        // Generate all possible combinations of truth values
        for (let i = 0; i < numRows; i++) {
            const row = {};
            const binary = i.toString(2).padStart(numVars, '0');
            
            // Assign truth values to variables based on mode
            for (let j = 0; j < numVars; j++) {
                const varName = variables[j];
                if (mode === '1s') {
                    row[varName] = binary[j] === '1';
                } else {
                    row[varName] = binary[j] === '0';
                }
            }
            
            // Calculate metrics
            const binaryStr = binary.split('').map(bit => bit === '1' ? '1' : '0').join('');
            const decimalValue = parseInt(binaryStr, 2);
            
            // Calculate the sum of 1s (regardless of mode)
            const sumOfOnes = binary.split('').filter(bit => bit === '1').length;
            
            // Determine which metric to use
            let metricValue;
            switch (metric) {
                case 'sum':
                    metricValue = sumOfOnes;
                    break;
                case 'value':
                    metricValue = decimalValue;
                    break;
                case 'odd':
                    metricValue = decimalValue % 2 !== 0 ? 1 : 0;
                    break;
                case 'even':
                    metricValue = decimalValue % 2 === 0 ? 1 : 0;
                    break;
                default:
                    metricValue = sumOfOnes;
            }
            
            // Evaluate the condition
            let conditionResult;
            switch (operator) {
                case '==': conditionResult = metricValue == conditionValue; break;
                case '!=': conditionResult = metricValue != conditionValue; break;
                case '>': conditionResult = metricValue > conditionValue; break;
                case '>=': conditionResult = metricValue >= conditionValue; break;
                case '<': conditionResult = metricValue < conditionValue; break;
                case '<=': conditionResult = metricValue <= conditionValue; break;
                default: conditionResult = false;
            }
            
            // Add metrics and result to row
            row.metricValue = metricValue;
            row.conditionValue = conditionValue;
            row.result = conditionResult;
            row.binary = binaryStr;
            row.decimal = decimalValue;
            
            table.push(row);
        }
        
        return table;
    }
    
    function displayTruthTable(tableData, variables, mode, metric, operator, value) {
        truthTable.innerHTML = '';
        
        // Create header row
        const headerRow = document.createElement('tr');
        headerRow.className = 'bg-indigo-50 text-indigo-800 font-semibold';
        
        // Add variable columns
        variables.forEach(variable => {
            const th = document.createElement('th');
            th.className = 'px-4 py-3 border-b border-gray-200';
            th.textContent = variable;
            headerRow.appendChild(th);
        });
        
        // Add binary and decimal columns
        const binaryTh = document.createElement('th');
        binaryTh.className = 'px-4 py-3 border-b border-gray-200';
        binaryTh.textContent = 'Binary';
        headerRow.appendChild(binaryTh);
        
        const decimalTh = document.createElement('th');
        decimalTh.className = 'px-4 py-3 border-b border-gray-200';
        decimalTh.textContent = 'Decimal';
        headerRow.appendChild(decimalTh);
        
        // Add metric column
        const metricTh = document.createElement('th');
        metricTh.className = 'px-4 py-3 border-b border-gray-200 bg-indigo-100';
        metricTh.textContent = `${metric} ${operator} ${value}`;
        headerRow.appendChild(metricTh);
        
        truthTable.appendChild(headerRow);
        
        // Add data rows
        tableData.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            
            // Highlight rows that meet the condition
            if (row.result) {
                tr.classList.add('highlight-row');
            }
            
            // Add variable values
            variables.forEach(variable => {
                const td = document.createElement('td');
                td.className = 'px-4 py-3 border-b border-gray-200';
                td.textContent = row[variable] ? '1' : '0';
                tr.appendChild(td);
            });
            
            // Add binary value
            const binaryTd = document.createElement('td');
            binaryTd.className = 'px-4 py-3 border-b border-gray-200 font-mono';
            binaryTd.textContent = row.binary;
            tr.appendChild(binaryTd);
            
            // Add decimal value
            const decimalTd = document.createElement('td');
            decimalTd.className = 'px-4 py-3 border-b border-gray-200 font-mono';
            decimalTd.textContent = row.decimal;
            tr.appendChild(decimalTd);
            
            // Add metric value and result
            const resultTd = document.createElement('td');
            resultTd.className = 'px-4 py-3 border-b border-gray-200 font-medium';
            resultTd.textContent = row.metricValue;
            
            // Color the result based on condition
            if (row.result) {
                resultTd.classList.add('text-green-600');
            } else {
                resultTd.classList.add('text-red-600');
            }
            
            tr.appendChild(resultTd);
            truthTable.appendChild(tr);
        });
    }
    
    function copyTableToClipboard() {
        const range = document.createRange();
        range.selectNode(truthTable);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                // Show copied feedback
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
                copyBtn.classList.remove('bg-indigo-600');
                copyBtn.classList.add('bg-green-600');
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.classList.remove('bg-green-600');
                    copyBtn.classList.add('bg-indigo-600');
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to copy table:', err);
        }
        
        window.getSelection().removeAllRanges();
    }
    
    function showError(message) {
        alert(message);
    }
});
