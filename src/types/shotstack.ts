export interface ShotstackRenderResponse {
    success: boolean;
    message: string;
    response: {
      id: string;
      message: string;
    };
  }
  
  export interface ShotstackStatusResponse {
    success: boolean;
    message: string;
    response: {
      id: string;
      status: 'queued' | 'rendering' | 'fetching' | 'ready' | 'failed';
      url?: string;
      error?: string;
    };
  }
  
  export interface ShotstackMergeFields {
    bgImage?: string;
    userImage?: string;
    paraName?: string;
    description?: string;
    pincode?: string;
  }
  
  export interface ShotstackIngestResponse {
    data: {
      type: string;
      id: string;
      attributes: {
        id: string;
        url: string;
        expires: string;
      };
    };
  }
  
  export interface ShotstackSourceResponse {
    data: {
      type: string;
      id: string;
      attributes: {
        id: string;
        owner: string;
        source: string;
        status: 'queued' | 'importing' | 'ready' | 'failed' | 'deleted';
        created: string;
        updated: string;
      };
    };
  }