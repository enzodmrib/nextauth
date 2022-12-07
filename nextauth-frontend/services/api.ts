import axios, { AxiosError } from 'axios';
import { GetServerSidePropsContext } from 'next';
import { parseCookies, setCookie } from 'nookies';
import { signOut } from '../contexts/AuthContext';
import { AuthTokenError } from '../errors/AuthTokenError';

interface AxiosErrorResponse {
  code?: string;
}

let isRefreshing = false;
let failedRequestsQueue: {
  onSuccess: (token: string) => void;
  onFailure: (err: AxiosError) => void;
}[] = [];

export function setupAPIClient(ctx: GetServerSidePropsContext | undefined = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`
    }
  });
  
  api.interceptors.response.use(response => {
    return response;
  }, (error: AxiosError<AxiosErrorResponse>) => {
    if (error.response?.status === 401) {
      if (error.response.data?.code === 'token.expired') {
        cookies = parseCookies(ctx);
  
        // stop ongoing requests until refresh is fulfilled, creating a request query
  
        const { 'nextauth.refreshToken': refreshToken } = cookies;
        const originalConfig: any = error.config;
  
        if (!isRefreshing) {
          isRefreshing = true;
  
          console.log('refresh')

          api.post('/refresh', {
            refreshToken,
          }).then(response => {
            const { token } = response.data;
  
            setCookie(ctx, 'nextauth.token', token, {
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: '/'
            });
  
            setCookie(ctx, 'nextauth.refreshToken', response.data.refreshToken, {
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: '/'
            });
  
            api.defaults.headers['Authorization'] = `Bearer ${token}`;
  
            failedRequestsQueue.forEach(request => request.onSuccess(token))
            failedRequestsQueue = [];
          }).catch(err => {
            failedRequestsQueue.forEach(request => request.onFailure(err))
            failedRequestsQueue = [];
  
            if(typeof window === "undefined") {
              signOut();
            } else {
              return Promise.reject(new AuthTokenError)
            }
          }).finally(() => {
            isRefreshing = false;
          });
        }
  
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({
            onSuccess: (token: string) => {
              originalConfig.headers['Authorization'] = `Bearer ${token}`
  
              resolve(api(originalConfig))
            }, // What will happen when the refresh process has finished successfully
            onFailure: (err: AxiosError) => {
              reject(err);
            }, // What will happen if the refresh process has failed
          })
        })
        //renovar o token
      } else {
        //deslogar o usuário
        signOut();
      }
    }
  
    return Promise.reject(error);
  });

  return api;
}