import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../utils/config';

export interface FerfarRequest {
  id: number;
  property_id: string;
  village_id: number | null;
  old_owner_name: string;
  new_owner_name: string;
  applicant_name: string;
  applicant_mobile: string;
  ferfar_type: string;
  remarks: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  srNo: number;
  wardNo: string;
  wastiName: string;
  plotNo: string;
  created_at: string;
  approved_at: string | null;
}

export interface FerfarResponse {
  data: FerfarRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useFerfarRequests = (page: number, limit: number, villageId?: number) => {
  return useQuery<FerfarResponse>({
    queryKey: ['ferfar', page, limit, villageId],
    queryFn: async () => {
      // API: GET /api/ferfar?page=N&limit=N[&village_id=N]
      // Returns: FerfarResponse { data: FerfarRequest[], pagination: { total, page, limit, totalPages } }
      // Auth: Bearer token required
      const url = new URL(`${API_BASE_URL}/api/ferfar`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());
      if (villageId) url.searchParams.append('village_id', villageId.toString());

      const token = localStorage.getItem('gp_token');
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('डेटा मिळवण्यात त्रुटी आली');
      }
      return response.json();
    },
    staleTime: 30 * 1000,       // Cache for 30s – prevents re-fetching 1000 records on tab switch
    gcTime: 5 * 60 * 1000,      // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when user switches windows
  });
};
