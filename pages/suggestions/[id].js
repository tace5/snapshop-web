import React, { useEffect, useState } from "react";
import nookies from "nookies";
import { firebaseAdmin } from "../../firebase/firebaseAdmin.js";
import { firebase } from "../../firebase/firebaseClient.js";
import { getSuggestion } from "../api/suggestions/[id].js";
import Layout from "../../components/layout/Layout.js";
import ImageGallery from "../../components/imageGallery/ImageGallery.js";
import ProductForm from "../../components/productForm/ProductForm.js";
import { useRouter } from "next/router.js";
import axios from "axios";
import { Button } from "react-bootstrap";

export const getServerSideProps = async (ctx) => {
    const cookies = nookies.get(ctx);
    const token = await firebaseAdmin.auth().verifyIdToken(cookies.token).catch(() => null);

    if (token === null || !token.admin) {
        return {
            redirect: {
                permanent: false,
                destination: "/",
            },
            props: {},
        };
    }

    const { id } = ctx.query;
    const suggestion = await getSuggestion(id);
    return { props: { suggestion } }
}

export default function ViewSuggestion({ suggestion }) {
    const { author } = suggestion;

    const [suggestionImageUrls, setSuggestionImageUrls] = useState([]);
    const [suggestionErrors, setSuggestionErrors] = useState({ name: null });
    const [fetchingImgs, setFetchingImgs] = useState(true);

    const router = useRouter();

    useEffect(() => {
        const storageRef = firebase.storage().ref();

        const getImgRef = async path => {
            return await storageRef.child(path).getDownloadURL();
        }
        const getAllImgUrls = async () => {
            Promise.all(suggestion.photos.map(path => getImgRef(path)))
                .then(urls => {
                    setSuggestionImageUrls(urls);
                    setFetchingImgs(false);
                });
        }

        getAllImgUrls();
    }, [])

    const onSuggestionApprove = ({ name, price, ingredientsList, locations, barcodeFormat, barcode, transportWeight, companyRating, packagingRating, overallRating }) => {
        axios.post("/api/suggestions/approve", {
            id: suggestion.id,
            name,
            price: parseFloat(price),
            barcodeFormat,
            barcode,
            ingredientsList,
            manufacturingLocation: locations.manufacturingLocation,
            packagingLocation: locations.packagingLocation,
            transportWeight: parseFloat(transportWeight),
            companyRating: parseInt(companyRating),
            packagingRating: parseInt(packagingRating),
            overallRating: parseInt(overallRating)
        })
            .then(() => {
                router.push("/suggestions");
            })
            .catch(errors => {
                setSuggestionErrors(errors.response.data);
            })
    }

    const onSuggestionReject = () => {
        axios.post("/api/suggestions/delete", { id: suggestion.id })
            .then(() => {
                router.push("/suggestions");
            })
            .catch(errors => {
                setSuggestionErrors(errors.response.data);
            })
    }

    const title = author.fullName + ": " + suggestion.format + "-" + suggestion.code;
    const breadCrumbs = [
        {
            href: "/suggestions",
            name: "Suggestions"
        },
        {
            href: "/suggestions" + suggestion.id,
            name: "View Suggestion"
        }
    ]

    const header = (
        <h2 className="mb-4">
            <div>
                { title }
                <div style={{float: "right"}}>
                    <Button onClick={onSuggestionReject} variant="danger" size="lg">Reject</Button>
                </div>
            </div>
        </h2>
    )

    return (
        <Layout title={title} breadcrumbs={breadCrumbs} header={header}>
            <div className="mb-4">
                <ImageGallery imageUrls={suggestionImageUrls} />
            </div>
            <ProductForm
                onSubmit={onSuggestionApprove}
                errors={suggestionErrors}
                submitBtnText="Add Suggestion"
                type="add"
                formData={{
                    name: null,
                    price: suggestion.price,
                    ingredients: [],
                    barcodeFormat: suggestion.format,
                    barcode: suggestion.code,
                    manufacturingLocation: null,
                    packagingLocation: null,
                    transportWeight: 5,
                    companyRating: 5,
                    packagingRating: 5,
                    overallRating: 5
                }}
            />
        </Layout>
    )
}