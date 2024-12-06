// A4 dimensions in pixels (at 96 DPI)
const A4_WIDTH_PX = 794;  // 210mm
const A4_HEIGHT_PX = 1123; // 297mm

var global_speed_multiplier = 1

// Target selection within valid ranges
function getRandomTargetInRange(arm) {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        // Generate random angle and distance within arm's reach
        const angle = Math.random() * Math.PI * 2;
        const distance = arm.minReach + Math.random() * (arm.totalLength - arm.minReach);
        
        const x = arm.rootPos.x + Math.cos(angle) * distance;
        const y = arm.rootPos.y + Math.sin(angle) * distance;
        
        if (arm.isPointInReach(new Vector2(x, y))) {
            return { x, y };
        }
        
        attempts++;
    }
    
    // Fallback to a guaranteed valid position
    const fallbackAngle = Math.random() * Math.PI * 2;
    const fallbackDistance = (arm.minReach + arm.totalLength) / 2;
    return {
        x: arm.rootPos.x + Math.cos(fallbackAngle) * fallbackDistance,
        y: arm.rootPos.y + Math.sin(fallbackAngle) * fallbackDistance
    };
}

class IKArm {
    constructor(type, rootPos, config = {}) {
        this.type = type;
        this.rootPos = rootPos;
        
        this.config = {
            jointRadius: config.jointRadius || 10,
            boneWidth: config.boneWidth || 5,
            baseSpeed: config.baseSpeed || 5,
            targetReachTolerance: config.targetReachTolerance || 2,
            targetSwitchDelay: config.targetSwitchDelay || 500,
            numJoints: config.numJoints || (type === 'two-bone' ? 3 : 5),
            segmentLength: config.segmentLength || 50,
            debugVisualization: config.debugVisualization || true,
            ...config
        };

        this.targetReached = false;
        this.targetReachTime = 0;

        this.segmentLengths = [];
        if (type === 'two-bone') {
            this.segmentLengths = [this.config.segmentLength, this.config.segmentLength];
        } else {
            for (let i = 0; i < this.config.numJoints - 1; i++) {
                this.segmentLengths.push(this.config.segmentLength);
            }
        }

        this.totalLength = this.segmentLengths.reduce((a, b) => a + b, 0);
        this.minReach = this.type === 'two-bone' ? 
            Math.abs(this.segmentLengths[0] - this.segmentLengths[1]) : 
            this.config.segmentLength;

        this.joints = [rootPos];
        let currentPos = rootPos;
        let targetCenter = new Vector2(A4_WIDTH_PX*0.5, A4_HEIGHT_PX*0.5)
        var dir = (targetCenter.subtract(rootPos)).normalize()  
        for (const length of this.segmentLengths) {          
            currentPos = new Vector2(currentPos.x, currentPos.y + length)
            this.joints.push(currentPos);
        }

        this.target = rootPos.add(dir.scale(this.totalLength*0.7));
        this.currentTarget = new Vector2(this.target.x, this.target.y);

        this.container = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.bones = [];
        this.jointElements = [];
        this.targetElement = null;

        this.initializeGraphics();
    }

    initializeGraphics() {
        if (this.config.debugVisualization) {
            const outerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            outerCircle.setAttribute("cx", this.rootPos.x);
            outerCircle.setAttribute("cy", this.rootPos.y);
            outerCircle.setAttribute("r", this.totalLength);
            outerCircle.setAttribute("class", "reach-range");

            const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            innerCircle.setAttribute("cx", this.rootPos.x);
            innerCircle.setAttribute("cy", this.rootPos.y);
            innerCircle.setAttribute("r", this.minReach);
            innerCircle.setAttribute("class", "reach-range");

            this.container.appendChild(outerCircle);
            this.container.appendChild(innerCircle);
        }

        for (let i = 1; i < this.joints.length; i++) {
            const bone = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bone.setAttribute("fill", "#666");
            this.bones.push(bone);
            this.container.appendChild(bone);
        }

        for (const joint of this.joints) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("r", this.config.jointRadius);
            circle.setAttribute("fill", "#333");
            this.jointElements.push(circle);
            this.container.appendChild(circle);
        }

        // Create interpolation target visualization
        this.interpolationElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        this.interpolationElement.setAttribute("r", this.config.jointRadius * 0.5);
        this.interpolationElement.setAttribute("fill", "blue");
        this.interpolationElement.setAttribute("opacity", "0.5");
        this.container.appendChild(this.interpolationElement);

        // Create target
        this.targetElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        this.targetElement.setAttribute("r", this.config.jointRadius);
        this.targetElement.setAttribute("fill", "red");
        this.container.appendChild(this.targetElement);
    } 

    solveTwoBoneIK(target) {
        const totalLength = this.segmentLengths.reduce((a, b) => a + b, 0);
        const targetDist = Vector2.distance(this.rootPos, target);

        if (targetDist > totalLength) {
            const dir = target.subtract(this.rootPos).normalize();
            return [
                this.rootPos,
                new Vector2(
                    this.rootPos.x + dir.x * this.segmentLengths[0],
                    this.rootPos.y + dir.y * this.segmentLengths[0]
                ),
                new Vector2(
                    this.rootPos.x + dir.x * totalLength,
                    this.rootPos.y + dir.y * totalLength
                )
            ];
        }

        const a = this.segmentLengths[0];
        const b = this.segmentLengths[1];
        const c = targetDist;

        const B = Math.acos((a * a + c * c - b * b) / (2 * a * c));
        const targetAngle = Math.atan2(
            target.y - this.rootPos.y,
            target.x - this.rootPos.x
        );

        const midX = this.rootPos.x + a * Math.cos(targetAngle + B);
        const midY = this.rootPos.y + a * Math.sin(targetAngle + B);

        return [this.rootPos, new Vector2(midX, midY), target];
    }

    solveCCD(target, iterations = 10) {
        const result = [...this.joints];

        for (let iter = 0; iter < iterations; iter++) {
            for (let i = result.length - 2; i >= 0; i--) {
                const toEndEffector = new Vector2(
                    result[result.length - 1].x - result[i].x,
                    result[result.length - 1].y - result[i].y
                );
                const toTarget = new Vector2(
                    target.x - result[i].x,
                    target.y - result[i].y
                );

                const angle = Math.atan2(toTarget.y, toTarget.x) -
                    Math.atan2(toEndEffector.y, toEndEffector.x);

                for (let j = i + 1; j < result.length; j++) {
                    const dx = result[j].x - result[i].x;
                    const dy = result[j].y - result[i].y;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    result[j] = new Vector2(
                        result[i].x + dx * cos - dy * sin,
                        result[i].y + dx * sin + dy * cos
                    );
                }
            }
        }

        return result;
    }

    solveFABRIK(target, iterations = 10) {
        const totalLength = this.segmentLengths.reduce((a, b) => a + b, 0);
        const targetDist = Vector2.distance(this.joints[0], target);
        const tempJoints = [...this.joints];
        const distances = [];

        for (let i = 0; i < this.joints.length - 1; i++) {
            distances.push(Vector2.distance(this.joints[i], this.joints[i + 1]));
        }

        if (targetDist > totalLength) {
            const dir = target.subtract(this.joints[0]).normalize();
            const result = [this.joints[0]];
            let currentPos = this.joints[0];

            for (const length of distances) {
                currentPos = currentPos.add(dir.scale(length));
                result.push(currentPos);
            }

            return result;
        }

        for (let iter = 0; iter < iterations; iter++) {
            tempJoints[tempJoints.length - 1] = target;

            for (let i = tempJoints.length - 2; i >= 0; i--) {
                const dir = tempJoints[i]
                    .subtract(tempJoints[i + 1])
                    .normalize();
                tempJoints[i] = tempJoints[i + 1].add(dir.scale(distances[i]));
            }

            tempJoints[0] = this.joints[0];

            for (let i = 1; i < tempJoints.length; i++) {
                const dir = tempJoints[i]
                    .subtract(tempJoints[i - 1])
                    .normalize();
                tempJoints[i] = tempJoints[i - 1].add(dir.scale(distances[i - 1]));
            }
        }

        return tempJoints;
    }

    update() {
        const toTarget = new Vector2(
            this.target.x - this.currentTarget.x,
            this.target.y - this.currentTarget.y
        );
        const distanceToTarget = toTarget.length();
        
        if (distanceToTarget <= this.config.targetReachTolerance) {
            if (!this.targetReached) {
                this.targetReached = true;
                this.targetReachTime = Date.now();
            }
            
            if (Date.now() - this.targetReachTime >= this.config.targetSwitchDelay) {
                const newTarget = getRandomTargetInRange(this);
                this.setTarget(newTarget.x, newTarget.y);
                this.targetReached = false;
            }
        }
        else
        if (distanceToTarget > this.config.baseSpeed*global_speed_multiplier) {
            const normalizedDirection = toTarget.scale(1/distanceToTarget);
            this.currentTarget = new Vector2(
                this.currentTarget.x + normalizedDirection.x * this.config.baseSpeed*global_speed_multiplier,
                this.currentTarget.y + normalizedDirection.y * this.config.baseSpeed*global_speed_multiplier
            );
        } else {
            this.currentTarget = new Vector2(this.target.x, this.target.y);
        }

        let newJoints;
        switch (this.type) {
            case 'two-bone':
                newJoints = this.solveTwoBoneIK(this.currentTarget);
                break;
            case 'ccd':
                newJoints = this.solveCCD(this.currentTarget);
                break;
            case 'fabrik':
                newJoints = this.solveFABRIK(this.currentTarget);
                break;
        }

        this.joints = newJoints;
        this.updateGraphics();
    }

    updateGraphics() {
        for (let i = 0; i < this.bones.length; i++) {
            const prev = this.joints[i];
            const next = this.joints[i + 1];
            const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
            const length = Vector2.distance(prev, next);

            this.bones[i].setAttribute("x", prev.x);
            this.bones[i].setAttribute("y", prev.y - this.config.boneWidth / 2);
            this.bones[i].setAttribute("width", length);
            this.bones[i].setAttribute("height", this.config.boneWidth);
            this.bones[i].setAttribute(
                "transform",
                `rotate(${angle * 180 / Math.PI} ${prev.x} ${prev.y})`
            );
        }

        for (let i = 0; i < this.jointElements.length; i++) {
            this.jointElements[i].setAttribute("cx", this.joints[i].x);
            this.jointElements[i].setAttribute("cy", this.joints[i].y);
        }

        // Update interpolation target
        this.interpolationElement.setAttribute("cx", this.currentTarget.x);
        this.interpolationElement.setAttribute("cy", this.currentTarget.y);

        // Update target
        this.targetElement.setAttribute("cx", this.target.x);
        this.targetElement.setAttribute("cy", this.target.y);
    }

    setTarget(x, y) {
        const newTarget = new Vector2(x, y);
        const distanceFromRoot = Vector2.distance(this.rootPos, newTarget);

        if (distanceFromRoot > this.totalLength || distanceFromRoot < this.minReach) {
            const dir = newTarget.subtract(this.rootPos).normalize();
            
            if (distanceFromRoot > this.totalLength) {
                this.target = this.rootPos.add(dir.scale(this.totalLength));
            } else {
                this.target = this.rootPos.add(dir.scale(this.minReach));
            }
        } else {
            this.target = newTarget;
        }
    }

    isPointInReach(point) {

        if (point.x < 0 || point.y < 0 || point.X > A4_WIDTH_PX || point.Y > A4_HEIGHT_PX)
        {
            return false;
        }
        const dist = Vector2.distance(this.rootPos, point);
        return dist <= this.totalLength && dist >= this.minReach;
    }
}