import { ModelContextType, ModelViewerController } from '@/types';
import { createContext, useContext, useRef } from 'react';
import * as THREE from 'three';

const ModelContext = createContext<ModelContextType | null>(null);

export const ModelProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const modelRef = useRef<THREE.Group | null>(null);

	const setModel = (model: THREE.Group) => {
		modelRef.current = model;
	};

	const rotateModel = (axis: 'x' | 'y' | 'z', angle: number) => {
		if (!modelRef.current) return;

		if (axis === 'x') modelRef.current.rotation.x = angle;
		if (axis === 'y') modelRef.current.rotation.y = angle;
		if (axis === 'z') modelRef.current.rotation.z = angle;
	};

	const scaleModel = (scale: number) => {
		if (!modelRef.current) return;
		modelRef.current.scale.set(scale, scale, scale);
	};

	const resetModel = () => {
		if (!modelRef.current) return;
		modelRef.current.rotation.set(0, 0, 0);
		modelRef.current.scale.set(1, 1, 1);
	};

	return (
		<ModelContext.Provider
			value={{ setModel, rotateModel, scaleModel, resetModel }}>
			{children}
		</ModelContext.Provider>
	);
};

export const useModel = () => {
	const context = useContext(ModelContext);
	if (!context) {
		throw new Error('useModel must be used within a ModelProvider');
	}
	return context;
};

// Hook for controlling the model viewer from parent components
export const useModelViewerRef = () => {
	return useRef<ModelViewerController | null>(null);
};
