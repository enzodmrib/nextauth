import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next"
import { destroyCookie, parseCookies } from "nookies"
import { AuthTokenError } from "../errors/AuthTokenError";

export function withSSRAuth<P extends { [key: string]: any; }>
  (fn: GetServerSideProps<P>): GetServerSideProps {
  return async (ctx: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(ctx)

    if (!cookies['nextauth.token']) {
      return {
        redirect: {
          destination: '/',
          permanent: false
        }
      }
    }

    try {
      return await fn(ctx)
    } catch (err) {
      if (err instanceof AuthTokenError) {
        destroyCookie(ctx, 'nextauth.token');
        destroyCookie(ctx, 'nextauth.refreshToken');
        console.log(err)

        return {
          redirect: {
            destination: '/',
            permanent: false
          }
        }
      }

      return {
        redirect: {
          destination: "/error", // Em caso de um erro não esperado, você pode redirecionar para uma página publica de erro genérico
          permanent: false,
        },
      };
    }
  }
}