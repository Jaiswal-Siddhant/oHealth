import ThreeModelViewer from '@/components/ThreeModelViewer';
import { ModelViewerHandle } from '@/types';
import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Button } from 'react-native';
import * as THREE from 'three';

const App = () => {
	const modelViewerRef = useRef<ModelViewerHandle>(null);
	const [selectedPart, setSelectedPart] = useState<string | null>(null);
	const [availableParts, setAvailableParts] = useState<string[]>([]);

	const colorOptions = [
		{ name: 'Red', value: 0xff0000 },
		{ name: 'Green', value: 0x00ff00 },
		{ name: 'Blue', value: 0x0000ff },
		{ name: 'Yellow', value: 0xffff00 },
		{ name: 'Purple', value: 0x800080 },
	];

	const handleMeshClick = (meshName: string) => {
		console.log(`Mesh clicked: ${meshName}`);
		setSelectedPart(meshName);
	};

	const handleModelLoaded = (model: THREE.Group) => {
		if (modelViewerRef.current) {
			const parts = modelViewerRef.current.getMeshNames();
			setAvailableParts(parts);
			console.log('Available parts in App:', parts);
		}
	};

	const changePartColor = (color: number) => {
		if (selectedPart && modelViewerRef.current) {
			modelViewerRef.current.changeMeshColor(selectedPart, color);
		}
	};

	return (
		<View style={styles.container}>
			{/* 3D Model Viewer */}
			<View style={styles.modelContainer}>
				<ThreeModelViewer
					ref={modelViewerRef}
					modelPath={require('../assets/models/body_converted.glb')}
					backgroundColor='#121212'
					autoRotate={false}
					onModelLoaded={handleModelLoaded}
					onMeshClick={handleMeshClick}
					enableGestures={true}
				/>
			</View>

			{/* Controls Panel */}
			<View style={styles.controls}>
				{/* Selected Part Display */}
				{selectedPart && (
					<View style={styles.section}>
						<Text style={styles.selectedPartText}>
							Selected: {selectedPart.split('_').join(' ')}
						</Text>
					</View>
				)}

				{/* Part Selection */}
				{availableParts.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Model Parts</Text>
						<View style={styles.partButtons}>
							{availableParts.map((part) => (
								<TouchableOpacity
									key={part}
									style={[
										styles.partButton,
										selectedPart === part &&
											styles.selectedPartButton,
									]}
									onPress={() => handleMeshClick(part)}>
									<Text style={styles.partButtonText}>
										{part}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>
				)}

				{/* Color Selection */}
				{/* {selectedPart && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Color Options</Text>
						<View style={styles.colorOptions}>
							{colorOptions.map((color) => (
								<TouchableOpacity
									key={color.name}
									style={[
										styles.colorButton,
										{
											backgroundColor: `#${color.value.toString(16)}`,
										},
									]}
									onPress={() => changePartColor(color.value)}
								/>
							))}
						</View>
					</View>
				)} */}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	modelContainer: {
		flex: 1,
	},
	controls: {
		padding: 15,
		backgroundColor: 'white',
		borderTopWidth: 1,
		borderTopColor: '#ddd',
		position: 'absolute',
		bottom: 0,
		width: '100%',
	},
	section: {
		marginBottom: 15,
	},
	sectionTitle: {
		fontWeight: 'bold',
		marginBottom: 8,
		fontSize: 16,
	},
	selectedPartText: {
		fontSize: 16,
		textAlign: 'center',
		marginVertical: 8,
	},
	partButtons: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	partButton: {
		padding: 8,
		margin: 4,
		backgroundColor: '#e0e0e0',
		borderRadius: 4,
	},
	selectedPartButton: {
		backgroundColor: '#bbdefb',
	},
	partButtonText: {
		fontSize: 14,
	},
	colorOptions: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		paddingVertical: 10,
	},
	colorButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#999',
	},
	controlButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 10,
	},
	rotationControls: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 10,
	},
	rotationButton: {
		padding: 10,
		backgroundColor: '#e0e0e0',
		borderRadius: 4,
	},
});

export default App;
