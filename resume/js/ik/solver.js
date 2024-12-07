class IKSolver {
    static solveTwoBoneIK(rootPos, segmentLengths, target) {
        const totalLength = segmentLengths.reduce((a, b) => a + b, 0);
        const targetDist = Vector2.distance(rootPos, target);

        if (targetDist > totalLength) {
            const dir = target.subtract(rootPos).normalize();
            return [
                rootPos,
                new Vector2(
                    rootPos.x + dir.x * segmentLengths[0],
                    rootPos.y + dir.y * segmentLengths[0]
                ),
                new Vector2(
                    rootPos.x + dir.x * totalLength,
                    rootPos.y + dir.y * totalLength
                )
            ];
        }

        const a = segmentLengths[0];
        const b = segmentLengths[1];
        const c = targetDist;

        const B = Math.acos((a * a + c * c - b * b) / (2 * a * c));
        const targetAngle = Math.atan2(
            target.y - rootPos.y,
            target.x - rootPos.x
        );

        const midX = rootPos.x + a * Math.cos(targetAngle + B);
        const midY = rootPos.y + a * Math.sin(targetAngle + B);

        return [rootPos, new Vector2(midX, midY), target];
    }

    static solveCCD(joints, target, iterations = 10) {
        const result = [...joints];

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

    static solveFABRIK(joints, segmentLengths, target, iterations = 10) {
        const totalLength = segmentLengths.reduce((a, b) => a + b, 0);
        const targetDist = Vector2.distance(joints[0], target);
        const tempJoints = [...joints];
        const distances = [];

        for (let i = 0; i < joints.length - 1; i++) {
            distances.push(Vector2.distance(joints[i], joints[i + 1]));
        }

        if (targetDist > totalLength) {
            const dir = target.subtract(joints[0]).normalize();
            const result = [joints[0]];
            let currentPos = joints[0];

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

            tempJoints[0] = joints[0];

            for (let i = 1; i < tempJoints.length; i++) {
                const dir = tempJoints[i]
                    .subtract(tempJoints[i - 1])
                    .normalize();
                tempJoints[i] = tempJoints[i - 1].add(dir.scale(distances[i - 1]));
            }
        }

        return tempJoints;
    }

    static isPointInReach(rootPos, totalLength, minReach, point) {

        if (point.x < 0 || point.y < 0 || point.X > A4_WIDTH_PX || point.Y > A4_HEIGHT_PX)
        {
            return false;
        }
        const dist = Vector2.distance(rootPos, point);
        return dist <= totalLength && dist >= minReach;
    }

    // Target selection within valid ranges
    static getRandomTargetInRange(rootPos, totalLength, minReach) {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            // Generate random angle and distance within arm's reach
            const angle = Math.random() * Math.PI * 2;
            const distance = minReach + Math.random() * (totalLength - minReach);
            
            const x = rootPos.x + Math.cos(angle) * distance;
            const y = rootPos.y + Math.sin(angle) * distance;
            
            if (IKSolver.isPointInReach(rootPos, totalLength, minReach, new Vector2(x, y))) {
                return { x, y };
            }
            
            attempts++;
        }
        
        // Fallback to a guaranteed valid position
        const fallbackAngle = Math.random() * Math.PI * 2;
        const fallbackDistance = (minReach + totalLength) / 2;
        return {
            x: rootPos.x + Math.cos(fallbackAngle) * fallbackDistance,
            y: rootPos.y + Math.sin(fallbackAngle) * fallbackDistance
        };
    }
}