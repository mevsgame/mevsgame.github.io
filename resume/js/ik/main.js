
// Init globals

var global_speed_multiplier = 1
// A4 dimensions in pixels (at 96 DPI)
const A4_WIDTH_PX = 794;  // 210mm
const A4_HEIGHT_PX = 1123; // 297mm

// Initialize arms
const svg = document.getElementById('animation-container');

const arms = [
    new IKArm('two-bone', new Vector2(0, 100), {
        segmentLength: 100,
        baseSpeed: 0.02,  
        targetReachTolerance: 2,
        targetSwitchDelay: 50,  
        debugVisualization: true
    }),
    
    new IKArm('two-bone', new Vector2(794, 450), {
        segmentLength: 100,
        baseSpeed:  0.02,  
        targetReachTolerance: 2,
        targetSwitchDelay: 50,  
        debugVisualization: true
    }),
    
    new IKArm('two-bone', new Vector2(400, 0), {
        segmentLength: 100,
        baseSpeed:  0.02,  
        targetReachTolerance: 2,
        targetSwitchDelay: 50,  
        debugVisualization: true
    }),
    new IKArm('ccd', new Vector2(894, 200), {
        segmentLength: 50,
        numJoints: 5,
        baseSpeed:  0.02, 
        targetReachTolerance: 3,
        targetSwitchDelay: 70,  
        debugVisualization: true
    }),
    new IKArm('fabrik', new Vector2(-100, 600), {
        segmentLength: 40,
        numJoints: 4,
        baseSpeed:  0.02,  
        targetReachTolerance: 2,
        targetSwitchDelay: 60,  
        debugVisualization: true
    }),
    new IKArm('fabrik', new Vector2(794, 700), {
        segmentLength: 40,
        numJoints: 4,
        baseSpeed:  0.02,  
        targetReachTolerance: 2,
        targetSwitchDelay: 60,  
        debugVisualization: true
    }),
    new IKArm('ccd', new Vector2(894, 900), {
        segmentLength: 50,
        numJoints: 5,
        baseSpeed:  0.02, 
        targetReachTolerance: 3,
        targetSwitchDelay: 70,  
        debugVisualization: true
    }),
    
    new IKArm('two-bone', new Vector2(400, 1100), {
        segmentLength: 100,
        baseSpeed:  0.02,  
        targetReachTolerance: 2,
        targetSwitchDelay: 50,  
        debugVisualization: true
    }),
];

// Add arms to SVG
arms.forEach(arm => {
    svg.appendChild(arm.container);
});

// Animation loop
function animate() {
    arms.forEach(arm => arm.update());
    requestAnimationFrame(animate);
}

// Start animation
animate();

// Get the container element
const container = document.getElementById('profile-pic');

container.addEventListener('mouseenter', () => {
    global_speed_multiplier = 100
});

container.addEventListener('mouseleave', () => {
    // Instead of stopping immediately, complete the current frame
    global_speed_multiplier = 1
});