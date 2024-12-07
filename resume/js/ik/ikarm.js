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
                const newTarget = IKSolver.getRandomTargetInRange(this.rootPos, this.totalLength, this.minReach);
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
                newJoints = IKSolver.solveTwoBoneIK(this.rootPos, this.segmentLengths, this.currentTarget);
                break;
            case 'ccd':
                newJoints = IKSolver.solveCCD(this.joints, this.currentTarget);
                break;
            case 'fabrik':
                newJoints = IKSolver.solveFABRIK(this.joints, this.segmentLengths, this.currentTarget);
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
}