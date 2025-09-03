import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsyncCallback<TArgs extends unknown[], TReturn = unknown>(
	callback: (...args: TArgs) => Promise<TReturn> | TReturn
) {
	const [isPending, setIsPending] = useState(false);
	const isMountedRef = useRef(true);

	// Track mounted state to avoid state updates after unmount
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const execute = useCallback(
		async (...args: TArgs) => {
			if (isPending) return;
			setIsPending(true);
			try {
				await Promise.resolve(callback(...args));
			} finally {
				if (isMountedRef.current) {
					setIsPending(false);
				}
			}
		},
		[callback, isPending]
	);

	return { execute, isPending } as const;
} 