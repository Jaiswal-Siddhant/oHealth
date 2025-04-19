export interface ThreeModelViewerProps {
	modelPath: number; // require path to the model
	initialRotation?: { x?: number; y?: number; z?: number };
	autoRotate?: boolean;
	autoRotateSpeed?: number;
	backgroundColor?: string;
	lightColor?: number;
	lightIntensity?: number;
	cameraPosition?: { x?: number; y?: number; z?: number };
	initialZoom?: number;
	minZoom?: number;
	maxZoom?: number;
	onModelLoaded?: (model: THREE.Group) => void;
	enableGestures?: boolean;
	onMeshClick?: (meshName: string) => void;
	selectedMeshColor?: number; // Color to apply to selected mesh
}

export interface SceneObjects {
	scene?: THREE.Scene;
	camera?: THREE.PerspectiveCamera;
	renderer?: Renderer;
	model?: THREE.Group;
	originalModel?: THREE.Group;
	raycaster?: THREE.Raycaster;
	meshes: THREE.Mesh[];
	originalMaterials: Map<string, THREE.Material | THREE.Material[]>;
	originalVisibility?: Map<string, boolean>;
	isolatedMesh?: THREE.Object3D | null;
}

export interface GestureState {
	previousDistance?: number;
	previousRotation?: number;
	previousX?: number;
	previousY?: number;
	isTap?: boolean;
	startTime?: number;
	lastTouchX?: number;
	lastTouchY?: number;
	lastCenterX?: number;
	lastCenterY?: number;
}

export interface ModelViewerHandle {
	rotateModel: (axis: 'x' | 'y' | 'z', angle: number) => void;
	zoomCamera: (zoomFactor: number) => void;
	resetView: () => void;
	selectMeshByName: (meshName: string) => boolean;
	changeMeshColor: (meshName: string, color: number) => boolean;
	getMeshNames: () => string[];
}

export interface ModelContextType {
	setModel: (model: THREE.Group) => void;
	rotateModel: (axis: 'x' | 'y' | 'z', angle: number) => void;
	scaleModel: (scale: number) => void;
	resetModel: () => void;
}

export interface ModelViewerController {
	rotateModel: (axis: 'x' | 'y' | 'z', angle: number) => void;
	zoomCamera: (zoomFactor: number) => void;
	resetView: () => void;
}
