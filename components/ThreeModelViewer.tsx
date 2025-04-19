import React, {
	useRef,
	useState,
	useEffect,
	useImperativeHandle,
	forwardRef,
} from 'react';
import {
	View,
	StyleSheet,
	Dimensions,
	GestureResponderEvent,
	PanResponderGestureState,
	PanResponder,
} from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import {
	GestureState,
	ModelViewerHandle,
	SceneObjects,
	ThreeModelViewerProps,
} from '@/types';

export const ThreeModelViewer = forwardRef<
	ModelViewerHandle,
	ThreeModelViewerProps
>(
	(
		{
			modelPath,
			initialRotation = { x: 0, y: 0, z: 0 },
			autoRotate = false,
			autoRotateSpeed = 0.01,
			backgroundColor = '#000',
			lightColor = 0xffffff,
			lightIntensity = 1,
			cameraPosition = { x: 0, y: 0, z: 3 },
			initialZoom = 1,
			minZoom = 0.5,
			maxZoom = 5,
			onModelLoaded,
			enableGestures = true,
			onMeshClick,
			selectedMeshColor = 0x00ff00,
		},
		ref
	) => {
		const sceneRef = useRef<SceneObjects>({
			meshes: [],
			originalMaterials: new Map(),
		} as SceneObjects);
		const gestureStateRef = useRef<GestureState>({});
		const requestAnimationFrameRef = useRef<number | null>(null);
		const glViewRef = useRef<View>(null);
		const [modelLoaded, setModelLoaded] = useState(false);
		const [selectedMesh, setSelectedMesh] = useState<string | null>(null);

		const [meshNames, setMeshNames] = useState<string[]>([]);

		const calculateDistance = (
			x1: number,
			y1: number,
			x2: number,
			y2: number
		) => {
			const dx = x1 - x2;
			const dy = y1 - y2;
			return Math.sqrt(dx * dx + dy * dy);
		};

		const calculateAngle = (
			x1: number,
			y1: number,
			x2: number,
			y2: number
		) => {
			return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
		};

		const getNormalizedTouchCoordinates = (x: number, y: number) => {
			const { width, height } = Dimensions.get('screen');
			return {
				x: (x / width) * 2 - 1,
				y: -(y / height) * 2 + 1,
			};
		};

		const isTap = (
			startX: number,
			startY: number,
			endX: number,
			endY: number,
			duration: number
		) => {
			const moveThreshold = 10;
			const timeThreshold = 300;

			const distance = Math.sqrt(
				Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
			);
			return distance < moveThreshold && duration < timeThreshold;
		};

		const resetAllMeshMaterials = () => {
			const { meshes, originalMaterials } = sceneRef.current;
			meshes.forEach((mesh) => {
				if (originalMaterials.has(mesh.name)) {
					mesh.material = originalMaterials.get(mesh.name) as
						| THREE.Material
						| THREE.Material[];
				}
			});
		};

		const handleMeshSelection = (x: number, y: number) => {
			const { raycaster, camera, scene, meshes, originalMaterials } =
				sceneRef.current;
			if (!raycaster || !camera || !scene || meshes.length === 0) return;

			console.log(`Touch position: (${x}, ${y})`);
			console.log(`Available meshes: ${meshes.length}`);
			meshes.forEach((mesh) => console.log(`Mesh: ${mesh.name}`));

			const normalizedCoords = getNormalizedTouchCoordinates(
				x,
				y - (selectedMesh ? 400 : 0)
			);
			console.log(
				`Normalized coordinates: (${normalizedCoords.x}, ${normalizedCoords.y})`
			);

			raycaster.setFromCamera(
				new THREE.Vector2(normalizedCoords.x, normalizedCoords.y),
				camera
			);

			const intersects = raycaster.intersectObjects(meshes, true);
			console.log(`Intersections found: ${intersects.length}`);

			resetAllMeshMaterials();

			if (selectedMesh) {
				setSelectedMesh(null);
			}

			if (intersects.length > 0) {
				let intersectedMesh = intersects[0].object;

				while (
					intersectedMesh &&
					!intersectedMesh.name &&
					intersectedMesh.parent
				) {
					intersectedMesh = intersectedMesh.parent;
				}

				if (
					intersectedMesh instanceof THREE.Mesh ||
					intersectedMesh instanceof THREE.Object3D
				) {
					const meshName = intersectedMesh.name;
					console.log(`Selected mesh: ${meshName}`);

					let actualMesh: THREE.Mesh | null = null;
					if (intersectedMesh instanceof THREE.Mesh) {
						actualMesh = intersectedMesh;
					} else {
						intersectedMesh.traverse((child) => {
							if (!actualMesh && child instanceof THREE.Mesh) {
								actualMesh = child;
							}
						});
					}

					if (actualMesh) {
						applyHighlightMaterial(actualMesh);

						setSelectedMesh(meshName);

						if (onMeshClick) {
							onMeshClick(meshName);
						}

						return meshName;
					}
				}
			}

			setSelectedMesh(null);
			return null;
		};

		const applyHighlightMaterial = (mesh: THREE.Mesh) => {
			console.log('Applying highlight material', selectedMeshColor);

			if (Array.isArray(mesh.material)) {
				const newMaterials = mesh.material.map((material) => {
					if (
						material instanceof THREE.MeshStandardMaterial ||
						material instanceof THREE.MeshBasicMaterial ||
						material instanceof THREE.MeshPhongMaterial
					) {
						const newMaterial = material.clone();
						newMaterial.color.setHex(selectedMeshColor);
						if ('emissive' in newMaterial) {
							newMaterial.emissive.setHex(0x222222);
						}
						return newMaterial;
					}
					return material;
				});
				mesh.material = newMaterials;
			} else if (mesh.material instanceof THREE.Material) {
				try {
					const newMaterial = mesh.material.clone();
					if ('color' in newMaterial) {
						// @ts-ignore
						newMaterial.color.setHex(selectedMeshColor);
					}
					if ('emissive' in newMaterial) {
						// @ts-ignore
						newMaterial.emissive.setHex(0x222222);
					}
					mesh.material = newMaterial;
				} catch (error) {
					console.error('Failed to clone material:', error);
				}
			}
		};

		const findMeshByName = (name: string): THREE.Mesh | null => {
			const { model } = sceneRef.current;
			let foundMesh: THREE.Mesh | null = null;

			if (!model) return null;

			model.traverse((object: any) => {
				if (
					!foundMesh &&
					object instanceof THREE.Mesh &&
					object.name === name
				) {
					foundMesh = object;
				}
			});

			return foundMesh;
		};

		const getMeshNames = (): string[] => {
			return meshNames;
		};

		const panResponder = useRef(
			PanResponder.create({
				onStartShouldSetPanResponder: () => enableGestures,
				onPanResponderGrant: (evt: GestureResponderEvent) => {
					const touches = evt.nativeEvent.touches;
					const currentTime = new Date().getTime();

					gestureStateRef.current.startTime = currentTime;

					if (touches.length === 1) {
						gestureStateRef.current.previousX = touches[0].pageX;
						gestureStateRef.current.previousY = touches[0].pageY;
						gestureStateRef.current.lastTouchX = touches[0].pageX;
						gestureStateRef.current.lastTouchY = touches[0].pageY;
						gestureStateRef.current.isTap = true;
					} else if (touches.length === 2) {
						const touch1 = touches[0];
						const touch2 = touches[1];

						const distance = calculateDistance(
							touch1.pageX,
							touch1.pageY,
							touch2.pageX,
							touch2.pageY
						);
						gestureStateRef.current.previousDistance = distance;

						const angle = calculateAngle(
							touch1.pageX,
							touch1.pageY,
							touch2.pageX,
							touch2.pageY
						);
						gestureStateRef.current.previousRotation = angle;

						gestureStateRef.current.isTap = false;
					}
				},

				onPanResponderMove: (
					evt: GestureResponderEvent,
					gestureState: PanResponderGestureState
				) => {
					const touches = evt.nativeEvent.touches;
					const { model, camera } = sceneRef.current;

					if (
						Math.abs(gestureState.dx) > 5 ||
						Math.abs(gestureState.dy) > 5
					) {
						gestureStateRef.current.isTap = false;
					}

					if (!model) return;

					if (touches.length === 1) {
						const { previousX, previousY } =
							gestureStateRef.current;
						if (previousX === undefined || previousY === undefined)
							return;

						const currentX = touches[0].pageX;
						const currentY = touches[0].pageY;

						const deltaX = currentX - previousX;
						const deltaY = currentY - previousY;

						model.rotation.y += deltaX * 0.01;
						model.rotation.x += deltaY * 0.01;

						gestureStateRef.current.previousX = currentX;
						gestureStateRef.current.previousY = currentY;
						gestureStateRef.current.lastTouchX = currentX;
						gestureStateRef.current.lastTouchY = currentY;
					} else if (touches.length === 2) {
						const touch1 = touches[0];
						const touch2 = touches[1];

						const centerX = (touch1.pageX + touch2.pageX) / 2;
						const centerY = (touch1.pageY + touch2.pageY) / 2;

						if (
							gestureStateRef.current.lastCenterX !== undefined &&
							gestureStateRef.current.lastCenterY !== undefined
						) {
							const deltaX =
								centerX - gestureStateRef.current.lastCenterX;
							const deltaY =
								centerY - gestureStateRef.current.lastCenterY;

							model.position.x += deltaX * 0.005;
							model.position.y -= deltaY * 0.005;
						}

						gestureStateRef.current.lastCenterX = centerX;
						gestureStateRef.current.lastCenterY = centerY;

						const currentDistance = calculateDistance(
							touch1.pageX,
							touch1.pageY,
							touch2.pageX,
							touch2.pageY
						);

						if (camera) {
							if (
								gestureStateRef.current.previousDistance &&
								gestureStateRef.current.previousDistance > 0
							) {
								const pinchChange =
									currentDistance /
									gestureStateRef.current.previousDistance;
								const currentZoom =
									(cameraPosition.z ?? 3) / camera.position.z;
								const newZoom = currentZoom * pinchChange;
								const clampedZoom = Math.max(
									minZoom,
									Math.min(maxZoom, newZoom)
								);
								camera.position.z =
									(cameraPosition.z ?? 3) / clampedZoom;
							}
							gestureStateRef.current.previousDistance =
								currentDistance;
						}

						const currentRotation = calculateAngle(
							touch1.pageX,
							touch1.pageY,
							touch2.pageX,
							touch2.pageY
						);

						if (
							gestureStateRef.current.previousRotation !==
							undefined
						) {
							const rotationDelta =
								(currentRotation -
									gestureStateRef.current.previousRotation) *
								0.1;
							model.rotation.z += rotationDelta * (Math.PI / 180);
							gestureStateRef.current.previousRotation =
								currentRotation;
						}
					}
				},

				onPanResponderRelease: (evt: GestureResponderEvent) => {
					const endTime = new Date().getTime();
					const startTime =
						gestureStateRef.current.startTime || endTime;
					const duration = endTime - startTime;

					if (
						gestureStateRef.current.isTap &&
						gestureStateRef.current.lastTouchX !== undefined &&
						gestureStateRef.current.lastTouchY !== undefined
					) {
						const isTapped = isTap(
							gestureStateRef.current.previousX || 0,
							gestureStateRef.current.previousY || 0,
							gestureStateRef.current.lastTouchX,
							gestureStateRef.current.lastTouchY,
							duration
						);

						if (isTapped) {
							console.log('Tap detected!');

							handleMeshSelection(
								gestureStateRef.current.lastTouchX,
								gestureStateRef.current.lastTouchY
							);
						}
					}

					gestureStateRef.current = {};
				},
			})
		).current;

		const cancelAnimation = () => {
			if (requestAnimationFrameRef.current !== null) {
				cancelAnimationFrame(requestAnimationFrameRef.current);
				requestAnimationFrameRef.current = null;
			}
		};

		useEffect(() => {
			return () => cancelAnimation();
		}, []);

		const onContextCreate = async (gl: any) => {
			const { drawingBufferWidth: width, drawingBufferHeight: height } =
				gl;

			const scene = new THREE.Scene();
			const camera = new THREE.PerspectiveCamera(
				75,
				width / height,
				0.1,
				1000
			);
			camera.position.set(
				cameraPosition.x ?? 0,
				cameraPosition.y ?? 0,
				cameraPosition.z ?? 3
			);

			const renderer = new Renderer({ gl });
			renderer.setSize(width, height);
			renderer.setClearColor(backgroundColor);

			const raycaster = new THREE.Raycaster();
			raycaster.params.Line = { threshold: 0.1 };
			raycaster.params.Points = { threshold: 0.1 };

			raycaster.params.Mesh = {
				threshold: 0,
				Line: { threshold: 0 },
				LOD: { threshold: 0 },
				Points: { threshold: 0 },
				Sprite: { threshold: 0 },
			};

			const light = new THREE.DirectionalLight(
				lightColor,
				lightIntensity
			);
			light.position.set(1, 1, 1);
			scene.add(light);

			const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
			scene.add(ambientLight);

			const pointLight = new THREE.PointLight(0xffffff, 1);
			pointLight.position.set(0, 0, 2);
			scene.add(pointLight);

			sceneRef.current = {
				scene,
				camera,
				renderer,
				raycaster,
				meshes: [],
				originalMaterials: new Map(),
			};

			const modelAsset = Asset.fromModule(modelPath);
			await modelAsset.downloadAsync();

			console.log('Loading model from:', modelAsset.localUri);

			const loader = new GLTFLoader();
			loader.load(
				modelAsset.localUri || '',
				(gltf) => {
					console.log('Model loaded successfully');
					const model = gltf.scene;
					model.position.set(0, 0, 0);

					model.rotation.x = initialRotation.x ?? 0;
					model.rotation.y = initialRotation.y ?? 0;
					model.rotation.z = initialRotation.z ?? 0;

					camera.position.z = cameraPosition.z ?? 1 / initialZoom;

					const meshes: THREE.Mesh[] = [];
					const names: string[] = [];

					model.traverse((child) => {
						if (child instanceof THREE.Mesh) {
							console.log(`Found mesh: ${child.name}`);
							names.push(child.name);
							meshes.push(child);

							child.userData.selectable = true;

							sceneRef.current.originalMaterials.set(
								child.name,
								child.material
							);
						}
					});

					setMeshNames(names);
					console.log(`Available parts: ${JSON.stringify(names)}`);

					sceneRef.current.meshes = meshes;
					scene.add(model);
					sceneRef.current.model = model;
					setModelLoaded(true);

					if (onModelLoaded) {
						onModelLoaded(model);
					}

					startAnimation(gl);
				},
				(progress) => {
					console.log(
						`Loading: ${(progress.loaded / progress.total) * 100}%`
					);
				},
				(error) => {
					console.error('GLB Load Error:', error);
				}
			);
		};

		const startAnimation = (gl: any) => {
			if (!sceneRef.current) return;

			const { scene, camera, renderer, model } = sceneRef.current;

			const animate = () => {
				if (model && autoRotate) {
					model.rotation.y += autoRotateSpeed;
				}

				renderer.render(scene, camera);
				gl.endFrameEXP();

				requestAnimationFrameRef.current =
					requestAnimationFrame(animate);
			};

			cancelAnimation();
			requestAnimationFrameRef.current = requestAnimationFrame(animate);
		};

		const rotateModel = (axis: 'x' | 'y' | 'z', angle: number) => {
			if (sceneRef.current?.model) {
				if (axis === 'x') sceneRef.current.model.rotation.x = angle;
				if (axis === 'y') sceneRef.current.model.rotation.y = angle;
				if (axis === 'z') sceneRef.current.model.rotation.z = angle;
			}
		};

		const zoomCamera = (zoomFactor: number) => {
			if (sceneRef.current?.camera) {
				const newZoom = Math.max(
					minZoom,
					Math.min(maxZoom, zoomFactor)
				);

				const initialZ = cameraPosition.z ?? 3;
				sceneRef.current.camera.position.z = initialZ / newZoom;
			}
		};

		const resetView = () => {
			if (sceneRef.current?.model && sceneRef.current?.camera) {
				sceneRef.current.model.rotation.set(
					initialRotation.x ?? 0,
					initialRotation.y ?? 0,
					initialRotation.z ?? 0
				);

				sceneRef.current.camera.position.set(
					cameraPosition.x ?? 0,
					cameraPosition.y ?? 0,
					cameraPosition.z ?? 3
				);

				resetAllMeshMaterials();
				setSelectedMesh(null);
			}
		};

		const selectMeshByName = (meshName: string) => {
			console.log(`Selecting mesh by name: ${meshName}`);

			resetAllMeshMaterials();

			setSelectedMesh(null);

			const mesh = findMeshByName(meshName);
			if (mesh) {
				console.log(`Found mesh: ${meshName}`);

				applyHighlightMaterial(mesh);

				setSelectedMesh(meshName);

				if (onMeshClick) {
					onMeshClick(meshName);
				}

				return true;
			}

			console.log(`Mesh not found: ${meshName}`);
			return false;
		};

		const changeMeshColor = (meshName: string, color: number) => {
			console.log(
				`Changing color of mesh ${meshName} to ${color.toString(16)}`
			);

			selectedMeshColor = color;

			if (selectedMesh === meshName) {
				const mesh = findMeshByName(meshName);
				if (mesh) {
					applyHighlightMaterial(mesh);
					return true;
				}
			} else {
				return selectMeshByName(meshName);
			}

			return false;
		};

		useImperativeHandle(ref, () => ({
			rotateModel,
			zoomCamera,
			resetView,
			selectMeshByName,
			changeMeshColor,
			getMeshNames,
		}));

		return (
			<View
				style={styles.container}
				{...panResponder.panHandlers}
				ref={glViewRef}>
				<GLView
					style={styles.glView}
					onContextCreate={onContextCreate}
				/>
			</View>
		);
	}
);

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	glView: {
		flex: 1,
	},
});

export default ThreeModelViewer;
