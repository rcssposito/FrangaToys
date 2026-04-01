import { useQuery } from '@tanstack/react-query';
import { EstudioSchema } from '@/lib/dto';
import { z } from 'zod';

const fetchEstudios = async (incluirInativos: boolean = false) => {
    const res = await fetch(`/api/estudios?incluirInativos=${incluirInativos}`);
    if (!res.ok) throw new Error('Failed to fetch estudios');
    const json = await res.json();
    return z.array(EstudioSchema).parse(json);
};

export const useEstudios = (incluirInativos: boolean = false) => {
    return useQuery({
        queryKey: ['estudios', incluirInativos],
        queryFn: () => fetchEstudios(incluirInativos),
    });
};
