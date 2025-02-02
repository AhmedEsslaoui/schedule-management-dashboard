import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  Query,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export function useCollection<T = DocumentData>(
  collectionName: string,
  queryConstraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q: Query<DocumentData> = query(
      collection(db, collectionName),
      ...queryConstraints
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as T);
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching collection:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName]);

  return { data, loading, error };
}

export function useFilteredSchedules(country?: string, status?: 'draft' | 'published') {
  const constraints: QueryConstraint[] = [];

  if (country) {
    constraints.push(where('country', '==', country));
  }
  if (status) {
    constraints.push(where('status', '==', status));
  }

  return useCollection('schedules', constraints);
}

export function useEmployeesByCountry(country?: string) {
  const constraints: QueryConstraint[] = [];

  if (country) {
    constraints.push(where('country', '==', country));
  }

  return useCollection('employees', constraints);
}
