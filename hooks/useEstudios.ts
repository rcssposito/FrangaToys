import { useQuery } from '@tanstack/react-query';
import { EstudioSchema } from '@/lib/dto';
import { z } from 'zod';

const fetchEstudios = async () => {
    const res = await fetch('/api/estudios');
    if (!res.ok) throw new Error('Failed to fetch estudios');
    const json = await res.json();
    return z.array(EstudioSchema).parse(json);
};

export const useEstudios = () => {
    return useQuery({
        queryKey: ['estudios'],
        queryFn: fetchEstudios,
    });
};
