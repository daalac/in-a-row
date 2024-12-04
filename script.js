class InARowGame {
    constructor(rows = 6, cols = 7, connectN = 4) {
        this.rows = rows;
        this.cols = cols;
        this.connectN = connectN;
        this.gameBoard = Array(rows).fill().map(() => Array(cols).fill(0));
        this.currentPlayer = 1;
        this.gameOver = false;
        this.botMode = false;
        this.difficulty = 'medium';
        this.setupGame();
    }

    setupGame() {
        const board = document.querySelector('.game-board');
        board.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        
        // Clear existing board
        board.innerHTML = '';
        
        // Create cells
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('click', () => this.makeMove(col));
                board.appendChild(cell);
            }
        }

        // Add reset button click handler
        const resetButton = document.querySelector('.reset-button');
        resetButton.addEventListener('click', () => this.resetGame());

        // Add mode button click handler
        const modeButton = document.querySelector('.mode-button');
        modeButton.addEventListener('click', () => this.toggleMode());

        // Add difficulty selector handler
        const difficultySelect = document.querySelector('.difficulty-select');
        difficultySelect.addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.resetGame();
        });

        this.updateStatus();
    }

    toggleMode() {
        this.botMode = !this.botMode;
        const modeButton = document.querySelector('.mode-button');
        const difficultySelect = document.querySelector('.difficulty-select');
        
        modeButton.classList.toggle('bot-active');
        modeButton.textContent = this.botMode ? 'Play vs Human' : 'Play vs Bot';
        difficultySelect.disabled = !this.botMode;
        
        this.resetGame();
    }

    makeMove(col) {
        if (this.gameOver) return;
        
        const row = this.getLowestEmptyRow(col);
        if (row === -1) return;  // Column is full

        this.gameBoard[row][col] = this.currentPlayer;
        this.updateCell(row, col);

        // Clear any previous winning highlights
        document.querySelectorAll('.cell.winning').forEach(cell => {
            cell.classList.remove('winning');
        });

        if (this.checkWin(row, col)) {
            this.gameOver = true;
            this.updateStatus(`Player ${this.currentPlayer} Wins!`);
            return;
        }

        if (this.isBoardFull()) {
            this.gameOver = true;
            this.updateStatus("It's a Draw!");
            return;
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateStatus();

        // Bot's turn
        if (this.botMode && this.currentPlayer === 2 && !this.gameOver) {
            setTimeout(() => this.makeBotMove(), 500);
        }
    }

    makeBotMove() {
        let col;
        
        switch(this.difficulty) {
            case 'easy':
                col = this.makeEasyMove();
                break;
            case 'medium':
                col = this.makeMediumMove();
                break;
            case 'hard':
                col = this.makeHardMove();
                break;
            default:
                col = this.makeMediumMove();
        }

        this.makeMove(col);
    }

    makeEasyMove() {
        // Random valid move
        let validCols = [];
        for (let col = 0; col < this.cols; col++) {
            if (this.getLowestEmptyRow(col) !== -1) {
                validCols.push(col);
            }
        }
        return validCols[Math.floor(Math.random() * validCols.length)];
    }

    makeMediumMove() {
        // Check for immediate win or block
        for (let col = 0; col < this.cols; col++) {
            const row = this.getLowestEmptyRow(col);
            if (row === -1) continue;

            // Check for win
            this.gameBoard[row][col] = 2;
            if (this.checkWin(row, col)) {
                this.gameBoard[row][col] = 0;
                return col;
            }
            this.gameBoard[row][col] = 0;

            // Check for block
            this.gameBoard[row][col] = 1;
            if (this.checkWin(row, col)) {
                this.gameBoard[row][col] = 0;
                return col;
            }
            this.gameBoard[row][col] = 0;
        }

        // Otherwise, make a strategic move
        return this.makeStrategicMove();
    }

    makeHardMove() {
        // Look ahead more moves and be more aggressive
        let bestScore = -Infinity;
        let bestCol = 0;

        // First check for immediate win
        for (let col = 0; col < this.cols; col++) {
            const row = this.getLowestEmptyRow(col);
            if (row === -1) continue;

            this.gameBoard[row][col] = 2;
            if (this.checkWin(row, col)) {
                this.gameBoard[row][col] = 0;
                return col;
            }
            
            // Look ahead for forced wins
            let score = this.evaluatePosition(row, col, 3);
            this.gameBoard[row][col] = 0;

            if (score > bestScore) {
                bestScore = score;
                bestCol = col;
            }
        }

        // If no winning move, play defensively
        for (let col = 0; col < this.cols; col++) {
            const row = this.getLowestEmptyRow(col);
            if (row === -1) continue;

            this.gameBoard[row][col] = 1;
            if (this.checkWin(row, col)) {
                this.gameBoard[row][col] = 0;
                return col;
            }
            this.gameBoard[row][col] = 0;
        }

        return bestScore > -Infinity ? bestCol : this.makeStrategicMove();
    }

    makeStrategicMove() {
        let bestScore = -Infinity;
        let bestCol = 0;

        for (let col = 0; col < this.cols; col++) {
            const row = this.getLowestEmptyRow(col);
            if (row === -1) continue;

            const score = this.evaluatePosition(row, col, 1);
            if (score > bestScore) {
                bestScore = score;
                bestCol = col;
            }
        }

        return bestCol;
    }

    evaluatePosition(row, col, depth) {
        let score = 0;

        // Prefer center columns
        const centerPreference = Math.abs(col - Math.floor(this.cols/2));
        score += (this.cols - centerPreference * 2);

        // Prefer lower rows
        score += (this.rows - row);

        // Check for potential connections
        const directions = [
            [0, 1],   // horizontal
            [1, 0],   // vertical
            [1, 1],   // diagonal right
            [1, -1]   // diagonal left
        ];

        directions.forEach(([dx, dy]) => {
            let count = 1;
            count += this.countPotentialConnections(row, col, dx, dy, 2);
            count += this.countPotentialConnections(row, col, -dx, -dy, 2);
            score += count * depth;
        });

        return score;
    }

    getLowestEmptyRow(col) {
        for (let row = this.rows - 1; row >= 0; row--) {
            if (this.gameBoard[row][col] === 0) {
                return row;
            }
        }
        return -1;  // Column is full
    }

    updateCell(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add(`player${this.currentPlayer}`);
    }

    updateStatus(message) {
        const status = document.querySelector('.game-status');
        status.textContent = message || `Player ${this.currentPlayer}'s Turn`;
    }

    checkWin(row, col) {
        const directions = [
            [0, 1],   // horizontal
            [1, 0],   // vertical
            [1, 1],   // diagonal right
            [1, -1]   // diagonal left
        ];

        const currentPlayer = this.gameBoard[row][col];
        
        return directions.some(([dx, dy]) => {
            let count = 1;
            let winningCells = [[row, col]];
            
            // Check in both directions
            for (let direction of [-1, 1]) {
                let r = row + dx * direction;
                let c = col + dy * direction;
                
                while (
                    r >= 0 && r < this.rows && 
                    c >= 0 && c < this.cols && 
                    this.gameBoard[r][c] === currentPlayer
                ) {
                    count++;
                    winningCells.push([r, c]);
                    r += dx * direction;
                    c += dy * direction;
                }
            }

            if (count >= this.connectN) {
                // Sort winning cells for consistent animation
                winningCells.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
                
                // Highlight winning cells
                winningCells.forEach(([r, c]) => {
                    const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                    cell.classList.add('winning');
                });
                return true;
            }
            return false;
        });
    }

    isBoardFull() {
        return this.gameBoard.every(row => row.every(cell => cell !== 0));
    }

    resetGame() {
        this.gameBoard = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.currentPlayer = 1;
        this.gameOver = false;
        
        // Reset all cells and remove animations
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.className = 'cell';
        });

        this.updateStatus();
    }

    drawWinningLine(startCell, endCell) {
        const board = document.querySelector('.game-board');
        const line = document.createElement('div');
        line.className = 'winning-line';
        
        const startRect = startCell.getBoundingClientRect();
        const endRect = endCell.getBoundingClientRect();
        const boardRect = board.getBoundingClientRect();
        
        const startX = startRect.left + startRect.width / 2 - boardRect.left;
        const startY = startRect.top + startRect.height / 2 - boardRect.top;
        const endX = endRect.left + endRect.width / 2 - boardRect.left;
        const endY = endRect.top + endRect.height / 2 - boardRect.top;
        
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const angle = Math.atan2(endY - startY, endX - startX);
        
        line.style.width = `${length}px`;
        line.style.left = `${startX}px`;
        line.style.top = `${startY}px`;
        line.style.transform = `rotate(${angle}rad)`;
        
        board.appendChild(line);
    }

    countPotentialConnections(row, col, dx, dy, player) {
        let count = 0;
        let currentRow = row + dx;
        let currentCol = col + dy;

        while (
            currentRow >= 0 && 
            currentRow < this.rows && 
            currentCol >= 0 && 
            currentCol < this.cols && 
            (this.gameBoard[currentRow][currentCol] === player || 
             this.gameBoard[currentRow][currentCol] === 0)
        ) {
            count++;
            currentRow += dx;
            currentCol += dy;
        }

        return count;
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new InARowGame();
});
