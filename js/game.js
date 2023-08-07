class Game {
  /**
   *
   * @param {number[][]} stage
   */
  constructor(stage) {
    this.stage = JSON.parse(JSON.stringify(stage));
    this.preStage = JSON.parse(JSON.stringify(this.stage));
    this.mode;
    this.ms = 10;

    this.currentMino = undefined;
    this.rotation = 0;
    this.criterion = { x: 4, y: 0 };

    /**
     * @type {{timestamp: number, name: string}[]}
     */
    this.operations = [];
    this.minos = [];

    document.body.onkeydown = (e) => {
      switch (e.key) {
        case "d":
        case "ArrowRight":
          this.moveRight();
          break;
        case "a":
        case "ArrowLeft":
          this.moveLeft();
          break;
        case "s":
        case "ArrowDown":
          this.moveDown();
          break;
        case "Enter":
          this.instantMoveDown();
          break;
        case " ":
          this.rotate();
          break;
      }
    };
  }

  setPreStage() {
    this.preStage = JSON.parse(JSON.stringify(this.stage));
  }

  /**
   *
   * @param {boolean} isRecordable
   * @param {"L"|"J"|"S"|"Z"|"O"|"I"} minoName
   */
  createNewMino(isRecordable = true, minoName = undefined) {
    if (isRecordable) {
      this.operations.push({
        timestamp: Date.now(),
        operation: "createNewMino",
      });
    }

    let mino;
    if (minoName) {
      console.log(minoName);
      mino = BLOCK_KIND[minoName];
    } else {
      mino = Mino.random();
    }

    for (let y = 0; y < mino.default.length; y++) {
      for (let x = 0; x < mino.default[y].length; x++) {
        if (mino.default[y][x] === STATUS.moving) {
          this.stage[y][x + 4] = mino.default[y][x];
        }
      }
    }

    this.currentMino = mino;
    this.rotation = 0;
    this.criterion = { x: 4, y: 0 };
    this.minos.push(mino.name);
  }

  /**
   *
   * @param {(x: number, y: number) => void} callback
   */
  eachBlock(callback) {
    const lengthY = this.stage.length;
    const lengthX = this.stage[0].length;

    for (let i = 0; i < lengthX * lengthY; i++) {
      const [x, y] = [i % lengthX, (i / lengthX) | 0];
      callback(x, y);
    }
  }

  start() {
    this.mode = MODE.START;
  }

  /**
   *
   * @param {"start"|"playback"} mode
   * @returns
   */
  main() {
    if (this.mode === MODE.STOP) return;

    this.setPreStage();

    if (frameCount % this.ms === 0) {
      if (this.getMovingPositions().length === 0) {
        this.mode === MODE.START ? this.createNewMino() : () => {};
      }

      this.moveDown(false);
    }
    this.deleteLine();
  }

  end() {
    this.mode === MODE.STOP;
  }

  moveRight(isRecordable = true) {
    if (isRecordable) {
      this.operations.push({ timestamp: Date.now(), operation: "moveRight" });
    }
    this.setPreStage();
    const movingPositions = this.getMovingPositions();

    if (movingPositions.length === 0) return;

    for (const position of movingPositions) {
      if (
        position.x + 1 >= this.stage[0].length ||
        this.stage[position.y][position.x + 1] === STATUS.stopped
      ) {
        return;
      }
    }

    for (const position of movingPositions) {
      this.stage[position.y][position.x + 1] = STATUS.moving;
      if (
        this.preStage[position.y][position.x - 1] !== STATUS.moving ||
        position.x === 0
      ) {
        this.stage[position.y][position.x] = STATUS.nothing;
      }
    }

    this.criterion.x += 1;
  }

  moveLeft(isRecordable = true) {
    if (isRecordable) {
      this.operations.push({ timestamp: Date.now(), operation: "moveLeft" });
    }
    this.setPreStage();
    const movingPositions = this.getMovingPositions();

    if (movingPositions.length === 0) return;

    for (const position of movingPositions) {
      if (
        position.x <= 0 ||
        this.stage[position.y][position.x - 1] === STATUS.stopped
      ) {
        return;
      }
    }

    movingPositions.forEach((position) => {
      this.stage[position.y][position.x - 1] = STATUS.moving;
      if (
        this.preStage[position.y][position.x + 1] !== STATUS.moving ||
        position.x === this.stage[0].length - 1
      ) {
        this.stage[position.y][position.x] = STATUS.nothing;
      }
    });

    this.criterion.x -= 1;
  }

  /**
   * @param {boolean} isRecordable
   * @returns {boolean} isCorrupted
   */
  moveDown(isRecordable = true) {
    if (isRecordable) {
      this.operations.push({ timestamp: Date.now(), operation: "moveDown" });
    }

    this.setPreStage();
    const movingPositions = this.getMovingPositions();

    if (movingPositions.length === 0) return;

    for (const position of movingPositions) {
      if (
        position.y + 1 >= this.stage.length ||
        this.preStage[position.y + 1][position.x] === STATUS.stopped
      ) {
        movingPositions.forEach((position) => {
          this.stage[position.y][position.x] = STATUS.stopped;
        });
        return true;
      }
    }

    for (const position of movingPositions) {
      if (
        position.y === 0 ||
        this.preStage[position.y - 1][position.x] === STATUS.nothing ||
        this.preStage[position.y - 1][position.x] === STATUS.stopped
      ) {
        this.stage[position.y][position.x] = STATUS.nothing;
      }
      this.stage[position.y + 1][position.x] = STATUS.moving;
    }

    this.criterion.y += 1;

    return false;
  }

  instantMoveDown(isRecordable = true) {
    if (isRecordable) {
      this.operations.push({
        timestamp: Date.now(),
        operation: "instantMoveDown",
      });
    }
    while (this.moveDown(false) === false) {}
  }

  rotate(isRecordable = true) {
    if (isRecordable) {
      this.operations.push({ timestamp: Date.now(), operation: "rotate" });
    }

    for (let y = this.criterion.y; y < this.criterion.y + 4; y++) {
      for (let x = this.criterion.x; x < this.criterion.x + 4; x++) {
        if (
          x < 0 ||
          x >= this.stage[0].length ||
          y < 0 ||
          y >= this.stage.length ||
          this.stage[y][x] === STATUS.stopped
        ) {
          return;
        }
      }
    }
    this.rotation = (this.rotation + 1) % 4;

    for (let y = this.criterion.y; y < this.criterion.y + 4; y++) {
      for (let x = this.criterion.x; x < this.criterion.x + 4; x++) {
        if (this.stage[y][x] !== STATUS.stopped) {
          this.stage[y][x] =
            this.currentMino[this.rotation][y - this.criterion.y][
              x - this.criterion.x
            ];
        }
      }
    }
  }

  deleteLine() {
    if (this.getMovingPositions().length === 0) return;

    for (let y = 0; y < this.stage.length; y++) {
      if (this.stage[y].every((status) => status === STATUS.stopped)) {
        this.stage.splice(y, 1);
        this.stage.unshift([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        this.stageLog();
      }
    }
  }

  getMovingPositions() {
    const movingPositions = [];
    this.eachBlock((x, y) => {
      if (this.stage[y][x] === STATUS.moving) {
        movingPositions.push({ x, y });
      }
    });
    return movingPositions;
  }

  stageLog() {
    if (
      JSON.parse(JSON.stringify(this.stage)) ===
      JSON.parse(JSON.stringify(this.preStage))
    ) {
      return;
    }

    let stage = "";
    this.stage.forEach((line, y) => {
      stage +=
        ("00" + y).slice(-2) +
        " | " +
        line
          .map((value, x) =>
            (x === this.criterion.x || x === this.criterion.x + 3) &&
            (y === this.criterion.y || y === this.criterion.y + 3)
              ? (value = "丸")
              : value === 0
              ? (value = "口")
              : value === 1
              ? (value = "田")
              : (value = "目")
          )
          .join("") +
        "\n";
    });
    console.log(stage);
  }

  playback() {
    this.mode = MODE.PLAYBACK;

    const { length } = this.operations;
    let i = 0;
    let minoCount = 0;
    const lag = Date.now() - this.operations[0].timestamp;

    const interval = setInterval(() => {
      if (i >= length) clearInterval(interval);

      // 時間が一致した場合に、オペレーションを行う
      if (this.operations[i].timestamp < Date.now() - lag) {
        const { operation } = this.operations[i];
        const cases = {
          moveRight: () => this.moveRight(false),
          moveLeft: () => this.moveLeft(false),
          moveDown: () => this.moveDown(false),
          instantMoveDown: () => {
            this.instantMoveDown(false);
          },
          rotate: () => this.rotate(false),
          createNewMino: () => {
            this.createNewMino(false, this.minos[minoCount]);
            minoCount++;
          },
        };

        cases[operation]();
        i++;
      }
    }, 1);

    this.setPreStage();
  }

  reset(stage) {
    this.stage = JSON.parse(JSON.stringify(stage));
    this.preStage = JSON.parse(JSON.stringify(stage));
    this.process = true;
    this.ms = 10;

    this.currentMino = undefined;
    this.rotation = 0;
    this.criterion = { x: 4, y: 0 };

    this.mode = MODE.STOP;
  }

  /**
   *
   * @param {"block"|"number"} mode
   */
  draw(mode = "block") {
    if (this.mode === MODE.STOP) return;

    this.eachBlock((x, y) => {
      const status = this.stage[y][x];

      if (mode === "block") {
        if (
          (x === this.criterion.x || x === this.criterion.x + 3) &&
          (y === this.criterion.y || y === this.criterion.y + 3)
        ) {
          fill(0, 255, 0, 50);
        } else if (status === STATUS.moving) {
          fill("red");
        } else if (status === STATUS.stopped) {
          fill("gray");
        } else {
          fill("white");
        }
        rect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      } else if (mode === "number") {
        textSize(20);
        textAlign(CENTER);
        if (status === STATUS.moving) {
          fill("red");
        } else if (status === STATUS.stopped) {
          fill("black");
        } else {
          fill("lightgray");
        }
        text(
          status,
          x * BLOCK_SIZE + BLOCK_SIZE / 2,
          y * BLOCK_SIZE + BLOCK_SIZE - BLOCK_SIZE / 5
        );
      }
    });
  }
}
