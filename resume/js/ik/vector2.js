class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    static distance(a, b) {
        return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    }

    normalize() {
        const len = Math.sqrt(this.x * this.x + this.y * this.y);
        return new Vector2(this.x / len, this.y / len);
    }

    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    scale(factor) {
        return new Vector2(this.x * factor, this.y * factor);
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
}