import { userType, companyType } from "./type.js";
import { getAllUsers, getAllCompanies } from "./resolve.js";
import { GraphQLObjectType } from "graphql";

export const adminQuery = {
    adminDashboard: {
        type: new GraphQLObjectType({
            name: "AdminDashboard",
            fields: {
                users: { type: userType },
                companies: { type: companyType }
            }
        }),
        resolve: async () => {
            return {
                users: await getAllUsers(),
                companies: await getAllCompanies()
            };
        }
    }
};
